import { z } from 'zod';

export const ALLOWED_AUDIO_MIME_TYPES = new Set([
  'audio/webm',
  'audio/ogg',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/x-m4a',
  'audio/aac',
  'audio/flac',
]);

export const transcribeVoiceFieldsSchema = z.object({
  language: z.string().trim().max(64).optional().default('auto'),
});

export const synthesizeVoiceSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, 'Text to speak cannot be empty.')
    .max(1500, 'Text for synthesis cannot exceed 1500 characters.'),
  language: z.string().trim().min(1).max(64).optional().default('en'),
  voiceId: z.string().trim().max(100).optional(),
  speed: z.coerce.number().min(0.75).max(1.5).optional().default(1.0),
});

export const extractComplaintSchema = z.object({
  transcript: z
    .string()
    .trim()
    .min(1, 'Transcript text is required for structured field extraction.')
    .max(3000, 'Transcript cannot exceed 3000 characters.'),
  language: z.string().trim().max(64).optional().default('auto'),
  existingFields: z
    .object({
      title: z.string().max(160).optional(),
      description: z.string().max(2600).optional(),
      category: z.string().max(80).optional(),
      categoryTouched: z.boolean().optional(),
      state: z.string().max(80).optional(),
      district: z.string().max(80).optional(),
      area: z.string().max(120).optional(),
    })
    .optional(),
});
