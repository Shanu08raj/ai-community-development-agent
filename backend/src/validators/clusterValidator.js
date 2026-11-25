import { z } from 'zod';
import {
  CATEGORIES,
  CLUSTER_REVIEW_STATUSES,
  COMPLAINT_STATUSES,
  PRIORITIES,
} from '../config/constants.js';

export const clusterQuerySchema = z.object({
  category: z.enum(['All', ...CATEGORIES]).optional(),
  priority: z.enum(['All', ...PRIORITIES]).optional(),
  status: z.enum(['All', ...COMPLAINT_STATUSES]).optional(),
  reviewStatus: z.enum(['All', ...CLUSTER_REVIEW_STATUSES]).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
});

export const reviewClusterSchema = z.object({
  reviewStatus: z.enum(CLUSTER_REVIEW_STATUSES, {
    error: 'Invalid cluster review status.',
  }),
  adminNotes: z.string().trim().max(600).optional().default(''),
  assignedAuthorityId: z.string().trim().optional(),
});
