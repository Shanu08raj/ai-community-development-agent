import { sendError } from '../utils/response.js';

export function notFoundHandler(req, res) {
  return sendError(
    res,
    404,
    'ROUTE_NOT_FOUND',
    `Endpoint ${req.method} ${req.originalUrl} does not exist.`
  );
}
