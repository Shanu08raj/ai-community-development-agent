import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const isTestEnv = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  IS_TEST: isTestEnv,
  PORT: Number(process.env.PORT || 5000),
  MONGODB_URI: process.env.MONGODB_URI || '',
  JWT_SECRET:
    process.env.JWT_SECRET ||
    (isTestEnv ? 'test_jwt_secret_key_for_vitest_only_min_32_chars' : ''),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  AI_SERVICE_URL: process.env.AI_SERVICE_URL || 'http://localhost:8000',
  AI_SERVICE_INTERNAL_SECRET:
    process.env.AI_SERVICE_INTERNAL_SECRET ||
    (isTestEnv ? 'test_internal_ai_secret_for_vitest' : ''),
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
};

export function validateEnv() {
  const missing = [];
  if (!env.IS_TEST) {
    if (!env.MONGODB_URI) missing.push('MONGODB_URI');
    if (!env.JWT_SECRET || env.JWT_SECRET.length < 16) missing.push('JWT_SECRET');
    if (!env.AI_SERVICE_INTERNAL_SECRET) missing.push('AI_SERVICE_INTERNAL_SECRET');
  }
  if (missing.length > 0) {
    throw new Error(`Missing or invalid required environment variables: ${missing.join(', ')}`);
  }
}
