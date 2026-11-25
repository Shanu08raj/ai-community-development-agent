import rateLimit from 'express-rate-limit';

function buildLimitHandler(code, message) {
  return (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code,
        message,
        details: [],
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.requestId || 'req_rate_limit',
      },
    });
  };
}

export function createLoginLimiter(maxRequests = 15) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    handler: buildLimitHandler(
      'TOO_MANY_LOGIN_ATTEMPTS',
      'Too many login attempts from this IP. Please try again later.'
    ),
  });
}

export function createSubmissionLimiter(maxRequests = 20) {
  return rateLimit({
    windowMs: 10 * 60 * 1000,
    max: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    handler: buildLimitHandler(
      'SUBMISSION_RATE_LIMIT',
      'Complaint submission rate limit exceeded. Please wait before submitting again.'
    ),
  });
}

export function createTrackingLimiter(maxRequests = 120) {
  return rateLimit({
    windowMs: 10 * 60 * 1000,
    max: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    handler: buildLimitHandler(
      'TRACKING_RATE_LIMIT',
      'Too many tracking lookup attempts. Please wait before retrying.'
    ),
  });
}

export const loginLimiter = createLoginLimiter();
export const submissionLimiter = createSubmissionLimiter();
export const trackingLimiter = createTrackingLimiter();
