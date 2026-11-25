import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const BCRYPT_ROUNDS = 10;
const DUMMY_HASH = '$2b$10$abcdefghijklmnopqrstuvABCDEFGHIJKLMNOPQRSTUVWXYZ01234';

/**
 * Generates a unique public reference ID matching format JS-2026-XXXX.
 */
export async function generateReferenceId(existsFn) {
  const year = 2026;
  for (let attempt = 0; attempt < 15; attempt += 1) {
    const num = crypto.randomInt(1000, 10000);
    const candidate = `JS-${year}-${num}`;
    if (!existsFn) return candidate;
    const exists = await existsFn(candidate);
    if (!exists) return candidate;
  }
  const fallbackNum = crypto.randomInt(10000, 100000);
  return `JS-${year}-${fallbackNum}`;
}

/**
 * Generates a confidential secret tracking code matching format TRACK-XXXX (6 chars suffix for strong entropy while keeping UX friendly).
 */
export function generateTrackingCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 6; i += 1) {
    suffix += chars[crypto.randomInt(0, chars.length)];
  }
  return `TRACK-${suffix}`;
}

export async function hashSecret(plainText) {
  return bcrypt.hash(String(plainText), BCRYPT_ROUNDS);
}

/**
 * Compares plaintext against bcrypt hash; executes a dummy compare when hash is null
 * to normalize response timing and avoid enumeration attacks.
 */
export async function compareSecret(plainText, hash) {
  if (!hash) {
    await bcrypt.compare(String(plainText || ''), DUMMY_HASH);
    return false;
  }
  return bcrypt.compare(String(plainText || ''), hash);
}

export function signAdminToken(admin) {
  return jwt.sign(
    {
      sub: String(admin._id),
      email: admin.email,
      role: admin.role,
      name: admin.fullName,
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
}

export function verifyAdminToken(token) {
  return jwt.verify(token, env.JWT_SECRET);
}
