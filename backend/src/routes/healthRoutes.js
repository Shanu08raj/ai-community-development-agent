import { Router } from 'express';
import mongoose from 'mongoose';
import { sendSuccess } from '../utils/response.js';

const router = Router();

router.get('/', (_req, res) => {
  const dbReady = mongoose.connection.readyState === 1;
  return sendSuccess(res, 200, {
    service: 'jansetu-backend',
    status: 'ok',
    database: dbReady ? 'connected' : 'disconnected',
    uptimeSeconds: Math.floor(process.uptime()),
  });
});

export default router;
