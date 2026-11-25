import { z } from 'zod';
import {
  CATEGORIES,
  COMPLAINT_STATUSES,
  LANGUAGE_NAMES,
  PRIORITIES,
} from '../config/constants.js';

export const submitComplaintSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, 'Title must be at least 5 characters long.')
    .max(140, 'Title cannot exceed 140 characters.'),
  description: z
    .string()
    .trim()
    .min(15, 'Description must be at least 15 characters long.')
    .max(2500, 'Description cannot exceed 2500 characters.'),
  category: z.enum(CATEGORIES, {
    error: 'Selected category is not supported.',
  }),
  state: z.string().trim().max(50).optional().default('Maharashtra'),
  district: z.string().trim().max(50).optional().default('Pune'),
  area: z
    .string()
    .trim()
    .min(2, 'Area or ward name is required.')
    .max(100, 'Area cannot exceed 100 characters.'),
  preferredLanguage: z.enum(LANGUAGE_NAMES).optional().default('English'),
  contactInfo: z.string().trim().max(100).optional().default(''),
});

export const trackComplaintSchema = z.object({
  referenceId: z
    .string()
    .trim()
    .min(1, 'Reference ID is required.')
    .transform((v) => v.toUpperCase()),
  trackingCode: z
    .string()
    .trim()
    .min(1, 'Secret Tracking Code is required.')
    .transform((v) => v.toUpperCase()),
});

export const adminComplaintQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  category: z.enum(['All', ...CATEGORIES]).optional(),
  status: z.enum(['All', ...COMPLAINT_STATUSES]).optional(),
  priority: z.enum(['All', ...PRIORITIES]).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  sortBy: z.enum(['submittedDate', 'createdAt', 'priority', 'status']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const updateComplaintStatusSchema = z.object({
  newStatus: z.enum(COMPLAINT_STATUSES, {
    error: 'Invalid status value.',
  }),
  note: z.string().trim().max(500).optional().default(''),
  verifiedCategory: z.enum(CATEGORIES).optional(),
  verifiedPriority: z.enum(PRIORITIES).optional(),
  assignedAuthorityId: z.string().trim().optional(),
});
