import { getAdminAnalytics } from '../services/analyticsService.js';
import { listAuditLogs } from '../services/auditService.js';
import { listAuthorities } from '../services/authorityService.js';
import { listCommunityIssues, reviewCluster } from '../services/clusterService.js';
import {
  getAdminComplaintDetail,
  listAdminComplaints,
  updateComplaintStatus,
} from '../services/complaintService.js';
import { sendPaginated, sendSuccess } from '../utils/response.js';

export async function getComplaints(req, res) {
  const filters = req.validatedQuery || {};
  const { items, pagination } = await listAdminComplaints(filters);
  return sendPaginated(res, 200, items, pagination);
}

export async function getComplaintDetail(req, res) {
  const detail = await getAdminComplaintDetail(req.params.id);
  return sendSuccess(res, 200, detail);
}

export async function patchComplaintStatus(req, res) {
  const result = await updateComplaintStatus(
    req.params.id,
    req.body,
    req.admin,
    req.ip || '127.0.0.1'
  );
  return sendSuccess(res, 200, result, {
    message: 'Complaint status updated and audit entry recorded.',
  });
}

export async function getAdminCommunityIssues(req, res) {
  const filters = req.validatedQuery || {};
  const { items, pagination } = await listCommunityIssues(filters, true);
  return sendPaginated(res, 200, items, pagination);
}

export async function patchCommunityIssueReview(req, res) {
  const result = await reviewCluster(
    req.params.id,
    req.body,
    req.admin,
    req.ip || '127.0.0.1'
  );
  return sendSuccess(res, 200, result);
}

export async function getAuthorities(req, res) {
  const filters = req.validatedQuery || {};
  const authorities = await listAuthorities(filters);
  return sendSuccess(res, 200, authorities);
}

export async function getDashboardAnalytics(_req, res) {
  const analytics = await getAdminAnalytics();
  return sendSuccess(res, 200, analytics);
}

export async function getAuditLogs(req, res) {
  const filters = req.validatedQuery || {};
  const { items, pagination } = await listAuditLogs(filters);
  return sendPaginated(res, 200, items, pagination);
}
