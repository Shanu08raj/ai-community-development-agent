import { z } from 'zod';
import { AUDIT_ACTIONS } from '../config/constants.js';

export const auditLogQuerySchema = z.object({
  complaintId: z.string().trim().max(30).optional(),
  action: z.enum(['All', ...AUDIT_ACTIONS]).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});
