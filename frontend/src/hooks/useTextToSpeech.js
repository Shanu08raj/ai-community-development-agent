import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { voiceService } from '../services/voiceService';
import { useLanguage } from '../context/LanguageContext';

function findExactBrowserVoice(langMeta, availableVoices) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices =
    availableVoices && availableVoices.length > 0
      ? availableVoices
      : window.speechSynthesis.getVoices?.() || [];
  const targetCode = String(langMeta?.code || 'en').toLowerCase();
  const targetBcp = String(langMeta?.bcp47 || '').toLowerCase();

  return (
    voices.find((v) => v.lang?.toLowerCase() === targetBcp) ||
    voices.find((v) => v.lang?.toLowerCase().startsWith(`${targetCode}-`)) ||
    voices.find((v) => v.lang?.toLowerCase() === targetCode) ||
    null
  );
}

const INITIAL_PLAYBACK_STATE = {
  forLang: '',
  status: 'idle',
  activeProvider: '',
  notice: '',
  error: '',
};

export function useTextToSpeech({ initialLanguage } = {}) {
  const { selectedLanguage, getLanguageMeta, providers } = useLanguage();
  const controlledTarget = initialLanguage || selectedLanguage || 'en';

  const [pickerSelection, setPickerSelection] = useState(null);
  const [voiceSelection, setVoiceSelection] = useState(null);
  const [speed, setSpeedState] = useState(1.0);
  const [playbackState, setPlaybackState] = useState(INITIAL_PLAYBACK_STATE);
  const [browserVoices, setBrowserVoices] = useState(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      return window.speechSynthesis.getVoices?.() || [];
    }
    return [];
  });

  const audioRef = useRef(null);
  const objectUrlRef = useRef('');
  const abortRef = useRef(null);
  const modeRef = useRef('none'); // 'audio' | 'speechSynthesis' | 'none'

  const effectiveLangCode =
    pickerSelection && pickerSelection.forTarget === controlledTarget
      ? pickerSelection.code
      : controlledTarget;

  const languageMeta = getLanguageMeta(effectiveLangCode);
  const activePlayback =
    playbackState.forLang === languageMeta.code ? playbackState : INITIAL_PLAYBACK_STATE;
  const voiceId =
    voiceSelection && voiceSelection.forLang === languageMeta.code ? voiceSelection.id : '';

  const cleanupPlayback = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    if (objectUrlRef.current) {
      try {
        URL.revokeObjectURL(objectUrlRef.current);
      } catch {
        // Ignore non-browser revoke issues
      }
      objectUrlRef.current = '';
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore synth cancellation quirks
      }
    }
    modeRef.current = 'none';
  }, []);

  // Listen to async browser voice loading (Chrome populates getVoices asynchronously)
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return undefined;
    const synth = window.speechSynthesis;
    const syncVoices = () => {
      setBrowserVoices(synth.getVoices?.() || []);
    };
    syncVoices();
    if ('addEventListener' in synth) {
      synth.addEventListener('voiceschanged', syncVoices);
      return () => synth.removeEventListener('voiceschanged', syncVoices);
    }
    return undefined;
  }, []);

  // Stop active audio/speech whenever target language changes or component unmounts
  useEffect(() => {
    return () => cleanupPlayback();
  }, [languageMeta.code, cleanupPlayback]);

  const setLanguageCode = useCallback(
    (nextCode) => {
      cleanupPlayback();
      setPickerSelection({ forTarget: controlledTarget, code: nextCode });
      setVoiceSelection(null);
      setPlaybackState(INITIAL_PLAYBACK_STATE);
    },
    [controlledTarget, cleanupPlayback]
  );

  const setVoiceId = useCallback(
    (nextId) => {
      setVoiceSelection({ forLang: languageMeta.code, id: nextId });
    },
    [languageMeta.code]
  );

  const validPiperVoices = useMemo(() => {
    const raw = languageMeta?.piperVoices || [];
    return raw.filter((v) => v.downloaded || providers?.piperAutoDownload);
  }, [languageMeta, providers?.piperAutoDownload]);

  const matchedBrowserVoice = useMemo(
    () => findExactBrowserVoice(languageMeta, browserVoices),
    [languageMeta, browserVoices]
  );

  const voiceAvailability = useMemo(() => {
    if (validPiperVoices.length > 0 || languageMeta?.voiceDownloaded) {
      return { tier: 'local_piper', label: `Local Piper (${languageMeta.code})` };
    }
    if (providers?.optionalBhashiniEnabled) {
      return { tier: 'bhashini_cloud', label: `Optional Cloud (${languageMeta.code})` };
    }
    if (matchedBrowserVoice) {
      return { tier: 'browser_tts', label: `Browser Voice (${matchedBrowserVoice.lang})` };
    }
    return { tier: 'unsupported', label: `No voice available (${languageMeta.code})` };
  }, [validPiperVoices, languageMeta, providers?.optionalBhashiniEnabled, matchedBrowserVoice]);

  const stop = useCallback(() => {
    cleanupPlayback();
    setPlaybackState({
      forLang: languageMeta.code,
      status: 'idle',
      activeProvider: '',
      notice: '',
      error: '',
    });
  }, [cleanupPlayback, languageMeta.code]);

  const pause = useCallback(() => {
    if (modeRef.current === 'audio' && audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      setPlaybackState((prev) => ({ ...prev, forLang: languageMeta.code, status: 'paused' }));
    } else if (
      modeRef.current === 'speechSynthesis' &&
      typeof window !== 'undefined' &&
      'speechSynthesis' in window
    ) {
      window.speechSynthesis.pause();
      setPlaybackState((prev) => ({ ...prev, forLang: languageMeta.code, status: 'paused' }));
    }
  }, [languageMeta.code]);

  const resume = useCallback(() => {
    if (modeRef.current === 'audio' && audioRef.current && audioRef.current.paused) {
      audioRef.current.play().catch(() => {});
      setPlaybackState((prev) => ({ ...prev, forLang: languageMeta.code, status: 'playing' }));
    } else if (
      modeRef.current === 'speechSynthesis' &&
      typeof window !== 'undefined' &&
      'speechSynthesis' in window
    ) {
      window.speechSynthesis.resume();
      setPlaybackState((prev) => ({ ...prev, forLang: languageMeta.code, status: 'playing' }));
    }
  }, [languageMeta.code]);

  const setSpeed = useCallback((nextSpeed) => {
    const bounded = Math.max(0.75, Math.min(1.5, Number(nextSpeed) || 1.0));
    setSpeedState(bounded);
    if (audioRef.current) {
      audioRef.current.playbackRate = bounded;
    }
  }, []);

  const playWithBrowserFallback = useCallback(
    (cleanedText, targetMeta, serverErrMsg = '') => {
      const matchedVoice = findExactBrowserVoice(targetMeta, browserVoices);
      if (!matchedVoice || typeof SpeechSynthesisUtterance === 'undefined') {
        setPlaybackState({
          forLang: languageMeta.code,
          status: 'unsupported',
          activeProvider: '',
          notice: '',
          error:
            serverErrMsg ||
            `No suitable ${targetMeta.name} voice was found locally or in this browser. Written text remains shown above.`,
        });
        return false;
      }

      const utterance = new SpeechSynthesisUtterance(cleanedText);
      utterance.voice = matchedVoice;
      utterance.lang = matchedVoice.lang || targetMeta.bcp47;
      utterance.rate = speed;

      modeRef.current = 'speechSynthesis';
      utterance.onend = () => {
        modeRef.current = 'none';
        setPlaybackState((prev) => ({ ...prev, status: 'idle' }));
      };
      utterance.onerror = () => {
        modeRef.current = 'none';
        setPlaybackState((prev) => ({
          ...prev,
          status: 'error',
          error: `Browser speech synthesis failed for ${targetMeta.name}.`,
        }));
      };

      setPlaybackState({
        forLang: languageMeta.code,
        status: 'playing',
        activeProvider: `Browser (${matchedVoice.lang})`,
        notice: `Using browser voice (${matchedVoice.name}) as fallback because server neural audio for ${targetMeta.name} is unavailable.`,
        error: '',
      });
      window.speechSynthesis.speak(utterance);
      return true;
    },
    [browserVoices, languageMeta.code, speed]
  );

  const play = useCallback(
    async (text, overrideLangCode) => {
      const cleanedText = String(text || '').trim();
      if (!cleanedText) {
        setPlaybackState({
          forLang: languageMeta.code,
          status: 'error',
          activeProvider: '',
          notice: '',
          error: 'Nothing to read aloud.',
        });
        return;
      }

      cleanupPlayback();
      const targetMeta = getLanguageMeta(overrideLangCode || effectiveLangCode);
      setPlaybackState({
        forLang: languageMeta.code,
        status: 'loading',
        activeProvider: '',
        notice: '',
        error: '',
      });

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await voiceService.synthesizeSpeech({
          text: cleanedText,
          language: targetMeta.code,
          voiceId: voiceId || undefined,
          speed,
          signal: controller.signal,
        });

        const url = URL.createObjectURL(res.audioBlob);
        objectUrlRef.current = url;
        const audio = new Audio(url);
        audio.playbackRate = speed;
        audioRef.current = audio;
        modeRef.current = 'audio';

        audio.onended = () => {
          cleanupPlayback();
          setPlaybackState((prev) => ({ ...prev, status: 'idle' }));
        };
        audio.onerror = () => {
          cleanupPlayback();
          setPlaybackState((prev) => ({
            ...prev,
            status: 'error',
            error: 'Audio playback failed cleanly.',
          }));
        };

        setPlaybackState({
          forLang: languageMeta.code,
          status: 'playing',
          activeProvider: `${res.provider} (${res.voiceId || targetMeta.code})`,
          notice: '',
          error: '',
        });
        await audio.play();
      } catch (err) {
        if (err?.code === 'REQUEST_CANCELLED') {
          setPlaybackState((prev) => ({ ...prev, status: 'idle' }));
          return;
        }
        // Only fall back to browser speech if an exact native language voice exists — never silently speak English!
        playWithBrowserFallback(cleanedText, targetMeta, err?.message || '');
      } finally {
        abortRef.current = null;
      }
    },
    [cleanupPlayback, effectiveLangCode, getLanguageMeta, languageMeta.code, playWithBrowserFallback, speed, voiceId]
  );

  const replay = useCallback(
    (text, overrideLangCode) => play(text, overrideLangCode),
    [play]
  );

  return {
    languageCode: languageMeta.code,
    languageMeta,
    setLanguageCode,
    voiceId,
    setVoiceId,
    validPiperVoices,
    voiceAvailability,
    speed,
    setSpeed,
    status: activePlayback.status,
    activeProvider: activePlayback.activeProvider,
    notice: activePlayback.notice,
    error: activePlayback.error,
    play,
    replay,
    pause,
    resume,
    stop,
  };
}
