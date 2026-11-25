import crypto from 'crypto';

export function requestIdMiddleware(req, res, next) {
  req.requestId = `req_${crypto.randomBytes(5).toString('hex')}`;
  res.setHeader('X-Request-Id', req.requestId);
  next();
}
