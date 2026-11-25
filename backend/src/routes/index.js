import { Router } from 'express';
import adminRoutes from './adminRoutes.js';
import analyticsRoutes from './analyticsRoutes.js';
import { createAuthRouter } from './authRoutes.js';
import communityIssueRoutes from './communityIssueRoutes.js';
import { createComplaintRouter } from './complaintRoutes.js';
import healthRoutes from './healthRoutes.js';
import { createVoiceRouter } from './voiceRoutes.js';

export function createApiRouter(options = {}) {
  const router = Router();

  router.use('/health', healthRoutes);
  router.use('/auth', createAuthRouter(options.rateLimiters));
  router.use('/complaints', createComplaintRouter(options.rateLimiters));
  router.use('/voice', createVoiceRouter(options.rateLimiters));
  router.use('/community-issues', communityIssueRoutes);
  router.use('/analytics', analyticsRoutes);
  router.use('/admin', adminRoutes);

  return router;
}
