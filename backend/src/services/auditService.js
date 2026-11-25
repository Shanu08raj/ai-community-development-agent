import crypto from 'crypto';
import { AuditLog } from '../models/AuditLog.js';
import { formatAuditTimestamp } from '../utils/date.js';

export async function recordAuditLog({
  action,
  complaintId,
  previousStatus = 'None',
  newStatus,
  adminUser,
  adminId = null,
  note = '',
  ipAddress = '127.0.0.1',
  metadata = {},
}) {
  const now = new Date();
  const uniqueSuffix = crypto.randomInt(100, 999);
  const id = `LOG-${Date.now().toString().slice(-6)}${uniqueSuffix}`;

  return AuditLog.create({
    id,
    action,
    complaintId,
    previousStatus,
    newStatus,
    adminUser,
    adminId,
    note: String(note || '').slice(0, 500),
    timestamp: formatAuditTimestamp(now),
    ipAddress,
    metadata,
  });
}

export async function listAuditLogs(filters = {}) {
  const { complaintId, action, page = 1, limit = 20 } = filters;
  const query = {};

  if (complaintId) {
    query.complaintId = complaintId.toUpperCase();
  }
  if (action && action !== 'All') {
    query.action = action;
  }

  const skip = (page - 1) * limit;
  const [items, totalRecords] = await Promise.all([
    AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-__v -ipAddress -metadata')
      .lean(),
    AuditLog.countDocuments(query),
  ]);

  const totalPages = Math.ceil(totalRecords / limit) || 1;
  return {
    items,
    pagination: {
      currentPage: page,
      pageSize: limit,
      totalRecords,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}
