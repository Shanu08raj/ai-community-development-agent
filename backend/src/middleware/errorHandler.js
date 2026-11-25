import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';
import { sendError } from '../utils/response.js';

export function errorHandler(err, req, res, _next) {
  if (err instanceof ApiError) {
    return sendError(res, err.statusCode, err.code, err.message, err.details);
  }

  if (err?.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    return sendError(res, 400, 'BAD_REQUEST', 'Malformed JSON payload.');
  }

  if (err?.name === 'ValidationError') {
    const details = Object.values(err.errors || {}).map((e) => ({
      field: e.path || 'unknown',
      issue: e.message,
    }));
    return sendError(res, 422, 'VALIDATION_ERROR', 'Database schema validation failed.', details);
  }

  if (err?.code === 11000) {
    return sendError(res, 409, 'DUPLICATE_RESOURCE', 'A record with the provided identifier already exists.');
  }

  if (err?.name === 'CastError') {
    return sendError(res, 400, 'INVALID_IDENTIFIER', 'Invalid resource identifier format.');
  }

  logger.error('Unhandled backend exception', {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
    errorName: err?.name,
    errorMessage: err?.message,
  });

  return sendError(res, 500, 'INTERNAL_SERVER_ERROR', 'An unexpected internal error occurred.');
}
