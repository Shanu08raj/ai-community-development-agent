const SENSITIVE_KEYS = new Set([
  'password',
  'passwordHash',
  'trackingCode',
  'trackingCodeHash',
  'token',
  'secret',
  'jwt',
  'authorization',
  'x-internal-secret',
  'MONGODB_URI',
]);

export function sanitizeForLog(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeForLog);

  const sanitized = {};
  for (const [key, val] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key) || SENSITIVE_KEYS.has(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof val === 'object' && val !== null) {
      sanitized[key] = sanitizeForLog(val);
    } else {
      sanitized[key] = val;
    }
  }
  return sanitized;
}

export const logger = {
  info(message, meta = {}) {
    if (process.env.NODE_ENV === 'test') return;
    console.log(JSON.stringify({ level: 'info', timestamp: new Date().toISOString(), message, ...sanitizeForLog(meta) }));
  },
  warn(message, meta = {}) {
    if (process.env.NODE_ENV === 'test') return;
    console.warn(JSON.stringify({ level: 'warn', timestamp: new Date().toISOString(), message, ...sanitizeForLog(meta) }));
  },
  error(message, meta = {}) {
    if (process.env.NODE_ENV === 'test') return;
    console.error(JSON.stringify({ level: 'error', timestamp: new Date().toISOString(), message, ...sanitizeForLog(meta) }));
  },
};
