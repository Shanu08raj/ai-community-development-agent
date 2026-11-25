export function sendSuccess(res, statusCode, data, extraMeta = {}) {
  return res.status(statusCode).json({
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: res.req?.requestId || 'req_unknown',
      ...extraMeta,
    },
  });
}

export function sendPaginated(res, statusCode, data, pagination, extraMeta = {}) {
  return res.status(statusCode).json({
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: res.req?.requestId || 'req_unknown',
      pagination,
      ...extraMeta,
    },
  });
}

export function sendError(res, statusCode, code, message, details = []) {
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      details,
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: res.req?.requestId || 'req_unknown',
    },
  });
}
