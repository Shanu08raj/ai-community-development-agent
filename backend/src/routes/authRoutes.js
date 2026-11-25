import { Router } from 'express';
import { getMe, login } from '../controllers/authController.js';
import { requireAdminAuth } from '../middleware/auth.js';
import { loginLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../middleware/validate.js';
import { loginSchema } from '../validators/authValidator.js';

export function createAuthRouter(options = {}) {
  const router = Router();
  const limiter = options.loginLimiter || loginLimiter;

  router.post('/login', limiter, validate(loginSchema, 'body'), login);
  router.get('/me', requireAdminAuth, getMe);

  return router;
}
