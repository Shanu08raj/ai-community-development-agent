import { Router } from 'express';
import multer from 'multer';
import {
  extractComplaintController,
  getVoiceLanguagesController,
  synthesizeVoiceController,
  transcribeVoiceController,
} from '../controllers/voiceController.js';
import { voiceSttLimiter, voiceTtsLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../middleware/validate.js';
import { ApiError } from '../utils/ApiError.js';
import {
  ALLOWED_AUDIO_MIME_TYPES,
  extractComplaintSchema,
  synthesizeVoiceSchema,
  transcribeVoiceFieldsSchema,
} from '../validators/voiceValidator.js';

const MAX_AUDIO_BYTES = Number(process.env.VOICE_MAX_AUDIO_BYTES || 10 * 1024 * 1024);

const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_AUDIO_BYTES,
    files: 1,
    fields: 4,
  },
  fileFilter: (req, file, cb) => {
    const baseMime = (file.mimetype || '').split(';')[0].trim().toLowerCase();
    if (ALLOWED_AUDIO_MIME_TYPES.has(baseMime) || baseMime === 'application/octet-stream') {
      cb(null, true);
      return;
    }
    cb(
      new ApiError(
        422,
        'INVALID_AUDIO_FORMAT',
        'Unsupported audio MIME type. Allowed formats: WebM, OGG, WAV, MP3, M4A, FLAC.'
      )
    );
  },
});

function handleAudioUpload(req, res, next) {
  audioUpload.single('audio')(req, res, (err) => {
    if (!err) {
      req.body = req.body || {};
      if (!req.file) {
        next(
          new ApiError(
            422,
            'AUDIO_FILE_REQUIRED',
            'Please provide a recorded audio file for transcription.'
          )
        );
        return;
      }
      next();
      return;
    }
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        next(
          new ApiError(
            413,
            'AUDIO_TOO_LARGE',
            `Recorded audio exceeds the ${Math.round(MAX_AUDIO_BYTES / (1024 * 1024))} MB upload limit.`
          )
        );
        return;
      }
      next(new ApiError(422, 'AUDIO_UPLOAD_ERROR', err.message));
      return;
    }
    next(err);
  });
}

export function createVoiceRouter(options = {}) {
  const router = Router();
  const sttLimiter = options.voiceSttLimiter || voiceSttLimiter;
  const ttsLimiter = options.voiceTtsLimiter || voiceTtsLimiter;

  router.get('/languages', getVoiceLanguagesController);
  router.post(
    '/transcribe',
    sttLimiter,
    handleAudioUpload,
    validate(transcribeVoiceFieldsSchema, 'body'),
    transcribeVoiceController
  );
  router.post(
    '/synthesize',
    ttsLimiter,
    validate(synthesizeVoiceSchema, 'body'),
    synthesizeVoiceController
  );
  router.post(
    '/extract-complaint',
    sttLimiter,
    validate(extractComplaintSchema, 'body'),
    extractComplaintController
  );

  return router;
}
