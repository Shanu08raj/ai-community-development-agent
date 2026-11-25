import { ApiError } from '../utils/ApiError.js';
import { sendSuccess } from '../utils/response.js';
import {
  extractStructuredComplaint,
  fetchVoiceLanguages,
  synthesizeVoiceSpeech,
  transcribeVoiceAudio,
} from '../services/voiceService.js';

export async function getVoiceLanguagesController(req, res, next) {
  try {
    const data = await fetchVoiceLanguages();
    return sendSuccess(res, 200, data);
  } catch (err) {
    return next(err);
  }
}

export async function transcribeVoiceController(req, res, next) {
  try {
    if (!req.file || !req.file.buffer) {
      throw new ApiError(
        422,
        'AUDIO_FILE_REQUIRED',
        'Please provide a recorded audio file for transcription.'
      );
    }

    if (req.file.buffer.length < 64) {
      throw new ApiError(
        422,
        'EMPTY_AUDIO_RECORDING',
        'Recorded audio is empty or too short. Please speak clearly and retry.'
      );
    }

    const result = await transcribeVoiceAudio({
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
      originalname: req.file.originalname,
      language: req.body?.language || 'auto',
    });

    return sendSuccess(res, 200, {
      transcript: result.transcript,
      detectedLanguage: result.detectedLanguage,
      detectedLanguageCode: result.detectedLanguageCode,
      languageConfidence: result.languageConfidence,
      transcriptConfidence: result.transcriptConfidence,
      qualityStatus: result.qualityStatus,
      durationSeconds: result.durationSeconds,
      rtl: Boolean(result.rtl),
      provider: result.provider,
      model: result.model,
      recommendHumanReview: Boolean(result.recommendHumanReview),
      warnings: Array.isArray(result.warnings) ? result.warnings : [],
    });
  } catch (err) {
    return next(err);
  }
}

export async function synthesizeVoiceController(req, res, next) {
  try {
    const { text, language, voiceId, speed } = req.body;
    const { audioBuffer, meta } = await synthesizeVoiceSpeech({
      text,
      language,
      voiceId,
      speed,
    });

    res.status(200);
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Content-Length', audioBuffer.length);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Voice-Provider', meta.provider);
    res.setHeader('X-Voice-Id', meta.voiceId);
    res.setHeader('X-Voice-Language', meta.languageCode);
    res.setHeader('X-Voice-Sample-Rate', meta.sampleRate);
    return res.send(audioBuffer);
  } catch (err) {
    return next(err);
  }
}

export async function extractComplaintController(req, res, next) {
  try {
    const { transcript, language, existingFields } = req.body;
    const result = await extractStructuredComplaint({
      transcript,
      language,
      existingFields,
    });
    return sendSuccess(res, 200, result);
  } catch (err) {
    return next(err);
  }
}
