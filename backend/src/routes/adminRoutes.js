import { Router } from 'express';
import {
  getAdminCommunityIssues,
  getAuditLogs,
  getAuthorities,
  getComplaintDetail,
  getComplaints,
  getDashboardAnalytics,
  patchCommunityIssueReview,
  patchComplaintStatus,
} from '../controllers/adminController.js';
import { requireAdminAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { auditLogQuerySchema } from '../validators/auditLogValidator.js';
import { authorityQuerySchema } from '../validators/authorityValidator.js';
import { clusterQuerySchema, reviewClusterSchema } from '../validators/clusterValidator.js';
import {
  adminComplaintQuerySchema,
  updateComplaintStatusSchema,
} from '../validators/complaintValidator.js';

const router = Router();

router.use(requireAdminAuth);

router.get('/complaints', validate(adminComplaintQuerySchema, 'query'), getComplaints);
router.get('/complaints/:id', getComplaintDetail);
router.patch(
  '/complaints/:id/status',
  validate(updateComplaintStatusSchema, 'body'),
  patchComplaintStatus
);

router.get('/community-issues', validate(clusterQuerySchema, 'query'), getAdminCommunityIssues);
router.patch(
  '/community-issues/:id/review',
  validate(reviewClusterSchema, 'body'),
  patchCommunityIssueReview
);

router.get('/authorities', validate(authorityQuerySchema, 'query'), getAuthorities);
router.get('/analytics', getDashboardAnalytics);
router.get('/audit-logs', validate(auditLogQuerySchema, 'query'), getAuditLogs);

export default router;
