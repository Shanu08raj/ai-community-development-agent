import { ROLES } from '../config/constants.js';
import { env } from '../config/env.js';
import { Admin } from '../models/Admin.js';
import { ApiError } from '../utils/ApiError.js';
import { compareSecret, signAdminToken } from '../utils/crypto.js';

function parseExpiresInSeconds(expiresIn) {
  if (typeof expiresIn === 'number') return expiresIn;
  const str = String(expiresIn || '24h').trim();
  if (str.endsWith('h')) return parseInt(str, 10) * 3600;
  if (str.endsWith('d')) return parseInt(str, 10) * 86400;
  if (str.endsWith('m')) return parseInt(str, 10) * 60;
  return Number(str) || 86400;
}

export async function loginAdmin({ email, password }) {
  const admin = await Admin.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');

  const isPasswordValid = await compareSecret(password, admin?.passwordHash);

  if (!admin || !isPasswordValid) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'The email or password provided is incorrect.');
  }

  if (!admin.isActive || admin.role !== ROLES.ADMIN) {
    throw new ApiError(403, 'ACCOUNT_DISABLED', 'This administrator account is not permitted to sign in.');
  }

  admin.lastLoginAt = new Date();
  await admin.save();

  const token = signAdminToken(admin);

  return {
    token,
    expiresIn: parseExpiresInSeconds(env.JWT_EXPIRES_IN),
    admin: {
      id: String(admin._id),
      name: admin.fullName,
      email: admin.email,
      role: admin.role,
    },
  };
}

export async function getAdminProfile(adminId) {
  const admin = await Admin.findById(adminId).lean();
  if (!admin || !admin.isActive) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Administrator account not found.');
  }

  return {
    id: String(admin._id),
    name: admin.fullName,
    email: admin.email,
    role: admin.role,
    department: admin.department,
  };
}
