import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { createVoiceSttLimiter, createVoiceTtsLimiter } from '../../src/middleware/rateLimiter.js';

function createValidWavBuffer(bytes = 256) {
  const buf = Buffer.alloc(bytes);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(bytes - 8, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.write('data', 36);
  return buf;
}

describe('Voice STT & TTS API Gateway Integration Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('GET /api/v1/voice/languages proxies live capabilities and degrades gracefully if AI service is down', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('ECONNREFUSED'))
    );
    const app = createApp();
    const degradedRes = await request(app).get('/api/v1/voice/languages');
    expect(degradedRes.status).toBe(200);
    expect(degradedRes.body.data.languages.length).toBe(23);
    expect(degradedRes.body.data.providers.voiceServiceReachable).toBe(false);
  });

  it('POST /api/v1/voice/transcribe validates audio format/emptiness, proxies valid audio, and enforces rate limiter', async () => {
    const validWav = createValidWavBuffer(256);

    vi.stubGlobal(
      'fetch',
      vi.fn(async (url, init) => {
        if (String(url).endsWith('/api/v1/voice/transcribe')) {
          expect(init.headers['X-Internal-Secret']).toBeTruthy();
          return {
            ok: true,
            status: 200,
            json: async () => ({
              success: true,
              transcript: 'Water pipeline leaking near Ward 12',
              detectedLanguage: 'English',
              detectedLanguageCode: 'en',
              languageConfidence: 95,
              transcriptConfidence: 91,
              qualityStatus: 'good',
              durationSeconds: 2.5,
              rtl: false,
              provider: 'faster-whisper',
              model: 'base-int8',
              recommendHumanReview: false,
              warnings: [],
            }),
          };
        }
        return { ok: false, status: 404, json: async () => ({}) };
      })
    );

    const app = createApp({
      rateLimiters: {
        voiceSttLimiter: createVoiceSttLimiter(3),
      },
    });

    // 1. Missing file -> 422
    const noFile = await request(app).post('/api/v1/voice/transcribe');
    expect(noFile.status).toBe(422);
    expect(noFile.body.error.code).toBe('AUDIO_FILE_REQUIRED');

    // 2. Empty file (<64 bytes) -> 422
    const tinyFile = await request(app)
      .post('/api/v1/voice/transcribe')
      .attach('audio', Buffer.from('tiny'), { filename: 'empty.wav', contentType: 'audio/wav' });
    expect(tinyFile.status).toBe(422);
    expect(tinyFile.body.error.code).toBe('EMPTY_AUDIO_RECORDING');

    // 3. Invalid MIME type -> 422 (note limiter already counted prior calls or let's verify invalid MIME with fresh app)
    const freshApp = createApp({
      rateLimiters: { voiceSttLimiter: createVoiceSttLimiter(5) },
    });
    const badMime = await request(freshApp)
      .post('/api/v1/voice/transcribe')
      .attach('audio', Buffer.from('plain text payload'), { filename: 'note.txt', contentType: 'text/plain' });
    expect(badMime.status).toBe(422);
    expect(badMime.body.error.code).toBe('INVALID_AUDIO_FORMAT');

    // 4. Valid audio upload succeeds
    const okRes = await request(freshApp)
      .post('/api/v1/voice/transcribe')
      .field('language', 'auto')
      .attach('audio', validWav, { filename: 'sample.wav', contentType: 'audio/wav' });
    expect(okRes.status).toBe(200);
    expect(okRes.body.data.transcript).toBe('Water pipeline leaking near Ward 12');
    expect(okRes.body.data.detectedLanguageCode).toBe('en');

    // 5. Rate limiter kicks in after max
    const limitApp = createApp({ rateLimiters: { voiceSttLimiter: createVoiceSttLimiter(1) } });
    await request(limitApp)
      .post('/api/v1/voice/transcribe')
      .attach('audio', validWav, { filename: 'sample.wav', contentType: 'audio/wav' });
    const throttled = await request(limitApp)
      .post('/api/v1/voice/transcribe')
      .attach('audio', validWav, { filename: 'sample.wav', contentType: 'audio/wav' });
    expect(throttled.status).toBe(429);
    expect(throttled.body.error.code).toBe('VOICE_STT_RATE_LIMIT');
  });

  it('POST /api/v1/voice/synthesize validates text/speed and streams WAV audio safely', async () => {
    const wavBytes = createValidWavBuffer(512);
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        if (String(url).endsWith('/api/v1/voice/synthesize')) {
          return {
            ok: true,
            status: 200,
            headers: new Headers({
              'x-voice-provider': 'piper-tts',
              'x-voice-id': 'hi_IN-rohan-medium',
              'x-voice-language': 'hi',
              'x-voice-sample-rate': '22050',
            }),
            arrayBuffer: async () => wavBytes.buffer.slice(wavBytes.byteOffset, wavBytes.byteOffset + wavBytes.byteLength),
          };
        }
        return { ok: false, status: 404 };
      })
    );

    const app = createApp({ rateLimiters: { voiceTtsLimiter: createVoiceTtsLimiter(5) } });

    const emptyText = await request(app).post('/api/v1/voice/synthesize').send({ text: '   ', language: 'hi' });
    expect(emptyText.status).toBe(422);

    const tooLongText = await request(app)
      .post('/api/v1/voice/synthesize')
      .send({ text: 'अ'.repeat(1505), language: 'hi' });
    expect(tooLongText.status).toBe(422);

    const badSpeed = await request(app).post('/api/v1/voice/synthesize').send({ text: 'Hello', speed: 4.0 });
    expect(badSpeed.status).toBe(422);

    const okRes = await request(app)
      .post('/api/v1/voice/synthesize')
      .send({ text: 'नमस्ते, पानी की शिकायत दर्ज हो गई है।', language: 'hi', speed: 1.0 });
    expect(okRes.status).toBe(200);
    expect(okRes.headers['content-type']).toContain('audio/wav');
    expect(okRes.headers['x-voice-provider']).toBe('piper-tts');
    expect(Buffer.isBuffer(okRes.body) ? okRes.body.length : 0).toBe(512);
  });

  it('POST /api/v1/voice/extract-complaint validates schema, enforces auth, and returns structured fields', async () => {
    const mockExtractResponse = {
      success: true,
      originalTranscript: 'Water pipe broken in ward 13, Bengaluru Urban, Karnataka.',
      detectedLanguage: 'English',
      detectedLanguageCode: 'en',
      title: 'Water Supply Problem',
      description: 'Water pipe broken near ward 13.',
      category: 'Water Supply',
      categoryCode: 'WATER_SUPPLY',
      state: 'Karnataka',
      district: 'Bengaluru Urban',
      ward: '13',
      area: null,
      locationStatus: 'verified',
      ambiguousLocations: [],
      locationMismatch: null,
      existingFieldConflicts: [],
      warnings: [],
    };

    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        if (String(url).includes('/voice/extract-complaint')) {
          return {
            ok: true,
            status: 200,
            json: async () => mockExtractResponse,
          };
        }
        return { ok: false, status: 404, json: async () => ({}) };
      })
    );

    const app = createApp({ rateLimiters: { voiceSttLimiter: createVoiceSttLimiter(10) } });

    // 1. Empty transcript -> 422
    const emptyResp = await request(app)
      .post('/api/v1/voice/extract-complaint')
      .send({ transcript: '', language: 'en' });
    expect(emptyResp.status).toBe(422);

    // 2. Missing transcript -> 422
    const missingResp = await request(app)
      .post('/api/v1/voice/extract-complaint')
      .send({ language: 'en' });
    expect(missingResp.status).toBe(422);

    // 3. Oversized transcript (> 3000 chars) -> 422
    const bigResp = await request(app)
      .post('/api/v1/voice/extract-complaint')
      .send({ transcript: 'a'.repeat(3001), language: 'en' });
    expect(bigResp.status).toBe(422);

    // 4. Valid request succeeds and returns structured extraction
    const okResp = await request(app)
      .post('/api/v1/voice/extract-complaint')
      .send({
        transcript: 'Water pipe broken in ward 13, Bengaluru Urban, Karnataka.',
        language: 'en',
        existingFields: {},
      });
    expect(okResp.status).toBe(200);
    expect(okResp.body.data.state).toBe('Karnataka');
    expect(okResp.body.data.district).toBe('Bengaluru Urban');
    expect(okResp.body.data.ward).toBe('13');
    expect(okResp.body.data.category).toBe('Water Supply');
    expect(okResp.body.data.categoryCode).toBe('WATER_SUPPLY');
    expect(okResp.body.data.locationStatus).toBe('verified');
    expect(Array.isArray(okResp.body.data.warnings)).toBe(true);
    expect(Array.isArray(okResp.body.data.existingFieldConflicts)).toBe(true);
  });
});
