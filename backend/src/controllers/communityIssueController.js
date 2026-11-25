import { listCommunityIssues } from '../services/clusterService.js';
import { sendPaginated } from '../utils/response.js';

export async function getPublicCommunityIssues(req, res) {
  const filters = req.validatedQuery || {};
  const { items, pagination } = await listCommunityIssues(filters, false);
  return sendPaginated(res, 200, items, pagination);
}
