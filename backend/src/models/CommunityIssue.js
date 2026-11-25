import mongoose from 'mongoose';
import {
  CATEGORIES,
  CLUSTER_REVIEW_STATUSES,
  COMPLAINT_STATUSES,
  PRIORITIES,
} from '../config/constants.js';

const CommunityIssueSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      match: [/^CI-\d{3,5}$/, 'Cluster ID must follow format CI-XXX'],
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    category: {
      type: String,
      required: true,
      enum: CATEGORIES,
    },
    area: {
      type: String,
      required: true,
      trim: true,
    },
    relatedReportsCount: {
      type: Number,
      default: 1,
      min: 1,
    },
    priority: {
      type: String,
      enum: PRIORITIES,
      default: 'Medium',
    },
    status: {
      type: String,
      enum: COMPLAINT_STATUSES,
      default: 'Submitted',
    },
    lastUpdated: {
      type: String,
      required: true,
    },
    aiConfidence: {
      type: Number,
      min: 0,
      max: 100,
      default: 90,
    },
    recommendedAuthorityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Authority',
      default: null,
    },
    recommendedAuthority: {
      type: String,
      default: '',
    },
    reviewStatus: {
      type: String,
      enum: CLUSTER_REVIEW_STATUSES,
      default: 'Pending Admin Review',
    },
    adminNotes: {
      type: String,
      default: '',
      maxlength: 600,
    },
    summary: {
      type: String,
      required: true,
      maxlength: 600,
    },
    impactZones: {
      type: [String],
      default: [],
    },
    memberComplaintIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Complaint',
      },
    ],
  },
  {
    timestamps: true,
    collection: 'community_issues',
  }
);

CommunityIssueSchema.index({ category: 1, area: 1 });
CommunityIssueSchema.index({ status: 1, priority: 1 });
CommunityIssueSchema.index({ reviewStatus: 1 });

export const CommunityIssue = mongoose.model('CommunityIssue', CommunityIssueSchema);
