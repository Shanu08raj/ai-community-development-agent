import { ROLES } from '../config/constants.js';
import { Admin } from '../models/Admin.js';
import { ApiError } from '../utils/ApiError.js';
import { verifyAdminToken } from '../utils/crypto.js';

export async function requireAdminAuth(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new ApiError(401, 'UNAUTHORIZED', 'Authentication token is required.'));
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return next(new ApiError(401, 'UNAUTHORIZED', 'Authentication token is missing.'));
  }

  let payload;
  try {
    payload = verifyAdminToken(token);
  } catch {
    return next(new ApiError(401, 'INVALID_TOKEN', 'Authentication token is invalid or expired.'));
  }

  if (!payload?.sub || payload.role !== ROLES.ADMIN) {
    return next(new ApiError(403, 'FORBIDDEN', 'Insufficient permissions for administrative access.'));
  }

  const admin = await Admin.findById(payload.sub).lean();
  if (!admin || !admin.isActive || admin.role !== ROLES.ADMIN) {
    return next(new ApiError(401, 'UNAUTHORIZED', 'Administrator session is no longer valid.'));
  }

  req.admin = {
    id: String(admin._id),
    email: admin.email,
    fullName: admin.fullName,
    role: admin.role,
    department: admin.department,
  };

  return next();
}
