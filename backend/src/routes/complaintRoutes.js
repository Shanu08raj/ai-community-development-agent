import { Router } from 'express';
import {
  submitComplaint,
  trackComplaintStatus,
} from '../controllers/complaintController.js';
import { submissionLimiter, trackingLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../middleware/validate.js';
import {
  submitComplaintSchema,
  trackComplaintSchema,
} from '../validators/complaintValidator.js';

export function createComplaintRouter(options = {}) {
  const router = Router();
  const subLimiter = options.submissionLimiter || submissionLimiter;
  const trkLimiter = options.trackingLimiter || trackingLimiter;

  router.post('/', subLimiter, validate(submitComplaintSchema, 'body'), submitComplaint);
  router.post('/track', trkLimiter, validate(trackComplaintSchema, 'body'), trackComplaintStatus);

  return router;
}
