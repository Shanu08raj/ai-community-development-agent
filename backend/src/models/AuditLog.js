import mongoose from 'mongoose';
import { AUDIT_ACTIONS } from '../config/constants.js';

const AuditLogSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
    action: {
      type: String,
      required: true,
      enum: AUDIT_ACTIONS,
    },
    complaintId: {
      type: String,
      required: true,
    },
    previousStatus: {
      type: String,
      default: 'None',
    },
    newStatus: {
      type: String,
      required: true,
    },
    adminUser: {
      type: String,
      required: true,
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },
    note: {
      type: String,
      default: '',
      maxlength: 500,
    },
    timestamp: {
      type: String,
      required: true,
    },
    ipAddress: {
      type: String,
      default: '127.0.0.1',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    collection: 'audit_logs',
  }
);

AuditLogSchema.index({ complaintId: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });

// Protect audit records from unauthorized updates or deletions via Mongoose operations
const blockMutation = function blockAuditMutation() {
  throw new Error('AuditLog records are append-only and immutable.');
};

AuditLogSchema.pre('updateOne', blockMutation);
AuditLogSchema.pre('updateMany', blockMutation);
AuditLogSchema.pre('findOneAndUpdate', blockMutation);
AuditLogSchema.pre('findOneAndDelete', blockMutation);
AuditLogSchema.pre('deleteOne', blockMutation);

export const AuditLog = mongoose.model('AuditLog', AuditLogSchema);
