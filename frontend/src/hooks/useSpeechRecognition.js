import { useCallback, useEffect, useRef, useState } from 'react';
import { voiceService } from '../services/voiceService';

export const MAX_RECORDING_SECONDS = 120;

function pickSupportedMimeType() {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return '';
  }
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || '';
}

export function useSpeechRecognition({ language = 'auto', onTranscriptReady } = {}) {
  const isSupported =
    typeof window !== 'undefined' &&
    Boolean(navigator?.mediaDevices?.getUserMedia) &&
    typeof MediaRecorder !== 'undefined';

  const [status, setStatus] = useState('idle');
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState('');
  const [transcriptData, setTranscriptData] = useState(null);
  const [hasRecordedAudio, setHasRecordedAudio] = useState(false);
  const [error, setError] = useState('');

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const abortControllerRef = useRef(null);
  const cancelledRef = useRef(false);
  const audioUrlRef = useRef('');
  const lastBlobRef = useRef(null);
  const languageRef = useRef(language);
  const callbackRef = useRef(onTranscriptReady);

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  useEffect(() => {
    callbackRef.current = onTranscriptReady;
  }, [onTranscriptReady]);

  const stopMediaTracks = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const revokeAudioUrl = useCallback(() => {
    if (audioUrlRef.current) {
      try {
        URL.revokeObjectURL(audioUrlRef.current);
      } catch {
        // Ignore cleanup issues in non-browser DOM tests
      }
      audioUrlRef.current = '';
      setAudioUrl('');
    }
  }, []);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      if (abortControllerRef.current) abortControllerRef.current.abort();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // Ignore stop errors on unmount
        }
      }
      stopMediaTracks();
      revokeAudioUrl();
    };
  }, [stopMediaTracks, revokeAudioUrl]);

  const processRecordedBlob = useCallback(
    async (blob, overrideLang) => {
      if (!blob || blob.size < 64) {
        setStatus('error');
        setError('Recording appears empty. Please speak near the microphone and try again.');
        return;
      }

      lastBlobRef.current = blob;
      setHasRecordedAudio(true);
      const objectUrl = URL.createObjectURL(blob);
      revokeAudioUrl();
      audioUrlRef.current = objectUrl;
      setAudioUrl(objectUrl);

      setStatus('processing');
      setError('');

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const result = await voiceService.transcribeAudio(blob, {
          language: overrideLang || languageRef.current,
          signal: controller.signal,
        });
        setTranscriptData(result);
        setStatus('ready');
        if (callbackRef.current) {
          callbackRef.current(result);
        }
      } catch (err) {
        if (err?.code === 'REQUEST_CANCELLED') {
          setStatus('idle');
          return;
        }
        setStatus('error');
        setError(
          err?.message ||
            'Could not transcribe audio cleanly. You can retry, play back your clip, or type directly.'
        );
      } finally {
        abortControllerRef.current = null;
      }
    },
    [revokeAudioUrl]
  );

  const retranscribeWithLanguage = useCallback(
    async (nextLanguage) => {
      if (!lastBlobRef.current) return;
      languageRef.current = nextLanguage || 'auto';
      await processRecordedBlob(lastBlobRef.current, nextLanguage || 'auto');
    },
    [processRecordedBlob]
  );

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    stopMediaTracks();
  }, [stopMediaTracks]);

  const startRecording = useCallback(async () => {
    if (!isSupported) {
      setStatus('error');
      setError('Microphone recording is not supported in this browser. You can still type your complaint.');
      return;
    }

    setError('');
    setTranscriptData(null);
    revokeAudioUrl();
    cancelledRef.current = false;
    chunksRef.current = [];
    setDurationSeconds(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = pickSupportedMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        stopMediaTracks();
        setStatus('error');
        setError('Microphone recording encountered an error. Please retry or type directly.');
      };

      recorder.onstop = () => {
        stopMediaTracks();
        if (cancelledRef.current) {
          chunksRef.current = [];
          return;
        }
        const blobType = recorder.mimeType || mimeType || 'audio/webm';
        const fullBlob = new Blob(chunksRef.current, { type: blobType });
        chunksRef.current = [];
        processRecordedBlob(fullBlob);
      };

      recorder.start(250);
      setStatus('recording');

      timerRef.current = setInterval(() => {
        setDurationSeconds((prev) => {
          const next = prev + 1;
          if (next >= MAX_RECORDING_SECONDS) {
            stopRecording();
          }
          return next;
        });
      }, 1000);
    } catch (err) {
      stopMediaTracks();
      setStatus('error');
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        setError(
          'Microphone permission was denied. Enable microphone access in browser settings or type your complaint directly.'
        );
      } else if (err?.name === 'NotFoundError') {
        setError('No microphone device was detected. Connect a mic or type your complaint directly.');
      } else {
        setError('Unable to access microphone. You can type your complaint directly below.');
      }
    }
  }, [isSupported, processRecordedBlob, revokeAudioUrl, stopMediaTracks, stopRecording]);

  const cancelRecording = useCallback(() => {
    cancelledRef.current = true;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Ignore stop errors
      }
    }
    stopMediaTracks();
    revokeAudioUrl();
    lastBlobRef.current = null;
    setHasRecordedAudio(false);
    chunksRef.current = [];
    setDurationSeconds(0);
    setTranscriptData(null);
    setError('');
    setStatus('idle');
  }, [revokeAudioUrl, stopMediaTracks]);

  const clearTranscript = useCallback(() => {
    revokeAudioUrl();
    lastBlobRef.current = null;
    setHasRecordedAudio(false);
    setTranscriptData(null);
    setDurationSeconds(0);
    setError('');
    setStatus('idle');
  }, [revokeAudioUrl]);

  return {
    isSupported,
    status,
    durationSeconds,
    maxDurationSeconds: MAX_RECORDING_SECONDS,
    audioUrl,
    transcriptData,
    canRetranscribe: hasRecordedAudio,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
    clearTranscript,
    retranscribeWithLanguage,
  };
}
