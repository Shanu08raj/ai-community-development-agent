import { z } from 'zod';
import { CATEGORIES } from '../config/constants.js';

export const authorityQuerySchema = z.object({
  department: z.enum(['All', ...CATEGORIES]).optional(),
  search: z.string().trim().max(100).optional(),
});
