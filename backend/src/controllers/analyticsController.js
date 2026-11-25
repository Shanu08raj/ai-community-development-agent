import { getPublicStats } from '../services/analyticsService.js';
import { sendSuccess } from '../utils/response.js';

export async function getPublicCommunityStats(_req, res) {
  const stats = await getPublicStats();
  return sendSuccess(res, 200, stats);
}
