import { SUPPORTED_LANGUAGES } from '../config/constants.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';

function buildDegradedLanguagesPayload() {
  return {
    languages: SUPPORTED_LANGUAGES.map((entry) => ({
      code: entry.code,
      name: entry.name,
      nativeName: entry.native,
      script: 'Mixed',
      rtl: Boolean(entry.rtl),
      scheduledEighth: entry.code !== 'en',
      initialSupported: ['en', 'hi', 'kn', 'ta', 'te', 'mr', 'as', 'mni'].includes(entry.code),
      sttAvailable: false,
      sttSupportLevel: 'service_unavailable',
      sttProvider: 'none',
      ttsAvailable: false,
      ttsSupportLevel: 'browser_fallback_only',
      ttsProvider: 'browser-fallback',
      piperVoices: [],
      voiceDownloaded: false,
      qualityStatus: 'voice_service_unavailable',
      limitations: 'AI voice service is unreachable; text-based complaint submission and browser speech fallback remain available.',
      recommendHumanReview: true,
    })),
    providers: {
      localSttEnabled: false,
      localTtsEnabled: false,
      optionalBhashiniEnabled: false,
      voiceServiceReachable: false,
    },
  };
}

export async function fetchVoiceLanguages() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(`${env.AI_SERVICE_URL}/api/v1/voice/languages`, {
      method: 'GET',
      signal: controller.signal,
    });
    if (!res.ok) {
      return buildDegradedLanguagesPayload();
    }
    const body = await res.json();
    if (!body?.success || !Array.isArray(body?.languages)) {
      return buildDegradedLanguagesPayload();
    }
    return {
      languages: body.languages,
      providers: {
        ...(body.providers || {}),
        voiceServiceReachable: true,
      },
    };
  } catch (err) {
    logger.warn('Voice capabilities lookup fallback triggered', {
      reason: err?.name === 'AbortError' ? 'Timeout' : err?.message,
    });
    return buildDegradedLanguagesPayload();
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function transcribeVoiceAudio({ buffer, mimetype, originalname, language = 'auto' }) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);

  try {
    const cleanMime = (mimetype || 'audio/webm').split(';')[0].trim() || 'audio/webm';
    const form = new FormData();
    const blob = new Blob([buffer], { type: cleanMime });
    form.append('audio', blob, originalname || 'recording.webm');
    form.append('language', language || 'auto');

    const res = await fetch(`${env.AI_SERVICE_URL}/api/v1/voice/transcribe`, {
      method: 'POST',
      headers: {
        'X-Internal-Secret': env.AI_SERVICE_INTERNAL_SECRET,
      },
      body: form,
      signal: controller.signal,
    });

    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const detail = body?.detail || {};
      throw new ApiError(
        res.status >= 400 && res.status < 600 ? res.status : 502,
        detail.code || 'VOICE_TRANSCRIPTION_FAILED',
        detail.message || 'Unable to transcribe recorded audio. Please type your complaint directly.'
      );
    }

    return body;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    logger.warn('Voice STT proxy failed safely', {
      reason: err?.name === 'AbortError' ? 'Timeout' : err?.message,
    });
    throw new ApiError(
      503,
      'VOICE_SERVICE_UNAVAILABLE',
      err?.name === 'AbortError'
        ? 'Speech transcription timed out. Please record a shorter clip or type directly.'
        : 'Speech recognition service is currently unavailable. Please type your complaint directly.'
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function synthesizeVoiceSpeech({ text, language = 'en', voiceId, speed = 1.0 }) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const res = await fetch(`${env.AI_SERVICE_URL}/api/v1/voice/synthesize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': env.AI_SERVICE_INTERNAL_SECRET,
      },
      body: JSON.stringify({
        text,
        language,
        ...(voiceId ? { voiceId } : {}),
        speed,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => null);
      const detail = errBody?.detail || {};
      throw new ApiError(
        res.status >= 400 && res.status < 600 ? res.status : 502,
        detail.code || 'TTS_SYNTHESIS_FAILED',
        detail.message || 'Unable to generate spoken audio in the selected language.',
        detail.browserFallbackAllowed ? [{ browserFallbackAllowed: true }] : []
      );
    }

    const arrayBuf = await res.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuf);
    if (audioBuffer.length <= 44) {
      throw new ApiError(502, 'TTS_EMPTY_OUTPUT', 'Speech synthesizer returned empty audio.');
    }

    return {
      audioBuffer,
      meta: {
        provider: res.headers.get('x-voice-provider') || 'piper-tts',
        voiceId: res.headers.get('x-voice-id') || '',
        languageCode: res.headers.get('x-voice-language') || language,
        sampleRate: res.headers.get('x-voice-sample-rate') || '22050',
      },
    };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    logger.warn('Voice TTS proxy failed safely', {
      reason: err?.name === 'AbortError' ? 'Timeout' : err?.message,
    });
    throw new ApiError(
      503,
      'VOICE_SERVICE_UNAVAILABLE',
      'Voice synthesis service is temporarily unavailable.',
      [{ browserFallbackAllowed: true }]
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function extractStructuredComplaint({
  transcript,
  language = 'auto',
  existingFields = undefined,
}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(`${env.AI_SERVICE_URL}/api/v1/voice/extract-complaint`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': env.AI_SERVICE_INTERNAL_SECRET,
      },
      body: JSON.stringify({
        transcript,
        language: language || 'auto',
        ...(existingFields ? { existingFields } : {}),
      }),
      signal: controller.signal,
    });

    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.success) {
      const detail = body?.detail || {};
      throw new ApiError(
        res.status >= 400 && res.status < 600 ? res.status : 502,
        detail.code || 'COMPLAINT_EXTRACTION_FAILED',
        detail.message || 'Unable to extract structured complaint fields automatically.'
      );
    }

    return body;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    logger.warn('Complaint extraction proxy failed safely', {
      reason: err?.name === 'AbortError' ? 'Timeout' : err?.message,
    });
    throw new ApiError(
      503,
      'VOICE_SERVICE_UNAVAILABLE',
      'Field extraction service is temporarily unavailable. You can still review and edit your complaint manually.'
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
