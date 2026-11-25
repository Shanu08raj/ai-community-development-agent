import { getAdminProfile, loginAdmin } from '../services/authService.js';
import { sendSuccess } from '../utils/response.js';

export async function login(req, res) {
  const result = await loginAdmin(req.body);
  return sendSuccess(res, 200, result);
}

export async function getMe(req, res) {
  const profile = await getAdminProfile(req.admin.id);
  return sendSuccess(res, 200, profile);
}
