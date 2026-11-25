import { API_BASE_URL, ApiClientError } from './apiClient';
import { DEFAULT_VOICE_LANGUAGES } from '../data/voiceLanguages';

export const voiceService = {
  async getLanguages() {
    try {
      const res = await fetch(`${API_BASE_URL}/voice/languages`, { method: 'GET' });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success) {
        return { languages: DEFAULT_VOICE_LANGUAGES, providers: { voiceServiceReachable: false } };
      }
      return body.data;
    } catch {
      return { languages: DEFAULT_VOICE_LANGUAGES, providers: { voiceServiceReachable: false } };
    }
  },

  async transcribeAudio(audioBlob, { language = 'auto', signal } = {}) {
    if (!audioBlob || audioBlob.size < 64) {
      throw new ApiClientError(
        422,
        'EMPTY_AUDIO_RECORDING',
        'Recorded audio is empty or too short. Please record again or type directly.'
      );
    }

    const form = new FormData();
    const mime = (audioBlob.type || 'audio/webm').split(';')[0].trim() || 'audio/webm';
    const ext = mime.includes('wav') ? 'wav' : mime.includes('ogg') ? 'ogg' : 'webm';
    form.append('audio', audioBlob, `complaint-recording.${ext}`);
    form.append('language', language || 'auto');

    let response;
    try {
      response = await fetch(`${API_BASE_URL}/voice/transcribe`, {
        method: 'POST',
        body: form,
        signal,
      });
    } catch (err) {
      if (err?.name === 'AbortError') {
        throw new ApiClientError(0, 'REQUEST_CANCELLED', 'Voice transcription was cancelled.');
      }
      throw new ApiClientError(
        0,
        'NETWORK_ERROR',
        'Unable to reach voice transcription service. Check your connection or type your complaint directly.'
      );
    }

    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.success) {
      const apiErr = body?.error || {};
      throw new ApiClientError(
        response.status,
        apiErr.code || 'VOICE_TRANSCRIPTION_FAILED',
        apiErr.message || 'Could not transcribe recording. Please type or edit directly.',
        apiErr.details || []
      );
    }

    return body.data;
  },

  async synthesizeSpeech({ text, language = 'en', voiceId, speed = 1.0, signal } = {}) {
    const cleaned = String(text || '').trim();
    if (!cleaned) {
      throw new ApiClientError(422, 'EMPTY_TTS_TEXT', 'Nothing to read aloud.');
    }

    let response;
    try {
      response = await fetch(`${API_BASE_URL}/voice/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: cleaned.slice(0, 1500),
          language,
          ...(voiceId ? { voiceId } : {}),
          speed,
        }),
        signal,
      });
    } catch (err) {
      if (err?.name === 'AbortError') {
        throw new ApiClientError(0, 'REQUEST_CANCELLED', 'Audio generation cancelled.');
      }
      throw new ApiClientError(
        0,
        'NETWORK_ERROR',
        'Speech server is unreachable cleanly.',
        [{ browserFallbackAllowed: true }]
      );
    }

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const apiErr = body?.error || {};
      throw new ApiClientError(
        response.status,
        apiErr.code || 'TTS_SYNTHESIS_FAILED',
        apiErr.message || 'Voice synthesis failed for the selected language.',
        apiErr.details || []
      );
    }

    const audioBlob = await response.blob();
    return {
      audioBlob,
      provider: response.headers.get('X-Voice-Provider') || 'piper-tts',
      voiceId: response.headers.get('X-Voice-Id') || '',
      languageCode: response.headers.get('X-Voice-Language') || language,
    };
  },

  async extractComplaintFields({ transcript, language = 'auto', existingFields, signal } = {}) {
    const cleaned = String(transcript || '').trim();
    if (!cleaned) {
      throw new ApiClientError(422, 'EMPTY_TRANSCRIPT', 'Transcript text is empty.');
    }

    let response;
    try {
      response = await fetch(`${API_BASE_URL}/voice/extract-complaint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: cleaned.slice(0, 3000),
          language: language || 'auto',
          ...(existingFields ? { existingFields } : {}),
        }),
        signal,
      });
    } catch (err) {
      if (err?.name === 'AbortError') {
        throw new ApiClientError(0, 'REQUEST_CANCELLED', 'Field extraction cancelled.');
      }
      throw new ApiClientError(
        0,
        'NETWORK_ERROR',
        'Could not reach field extraction service. You can still edit and submit fields manually.'
      );
    }

    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.success) {
      const apiErr = body?.error || {};
      throw new ApiClientError(
        response.status,
        apiErr.code || 'COMPLAINT_EXTRACTION_FAILED',
        apiErr.message || 'Could not extract structured fields automatically.',
        apiErr.details || []
      );
    }

    return body.data;
  },
};
