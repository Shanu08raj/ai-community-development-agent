import mongoose from 'mongoose';
import {
  AI_DETECTED_CATEGORIES,
  AI_LANGUAGE_CODES,
  AI_LANGUAGE_NAMES,
  CATEGORIES,
  COMPLAINT_STATUSES,
  LANGUAGE_CODES,
  LANGUAGE_NAME_TO_CODE,
  LANGUAGE_NAMES,
  PRIORITIES,
} from '../config/constants.js';

const TimelineEventSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true,
      enum: COMPLAINT_STATUSES,
    },
    date: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    note: {
      type: String,
      required: true,
      maxlength: 500,
    },
    updatedBy: {
      type: String,
      default: 'System',
    },
  },
  { _id: false }
);

const HumanReviewSchema = new mongoose.Schema(
  {
    verifiedCategory: {
      type: String,
      enum: [...CATEGORIES, null],
      default: null,
    },
    verifiedPriority: {
      type: String,
      enum: [...PRIORITIES, null],
      default: null,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },
    reviewedByName: {
      type: String,
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewNote: {
      type: String,
      default: '',
      maxlength: 500,
    },
  },
  { _id: false }
);

const AIAnalysisSchema = new mongoose.Schema(
  {
    confidence: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    detectedLanguage: {
      type: String,
      enum: AI_LANGUAGE_NAMES,
      default: 'English',
    },
    detectedLanguageCode: {
      type: String,
      enum: AI_LANGUAGE_CODES,
      default: 'en',
    },
    languageConfidence: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    detectedCategory: {
      type: String,
      enum: AI_DETECTED_CATEGORIES,
    },
    detectedPriority: {
      type: String,
      enum: PRIORITIES,
    },
    priorityReason: {
      type: String,
      default: '',
    },
    recommendedAuthorityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Authority',
      default: null,
    },
    recommendedAuthorityCode: {
      type: String,
      default: null,
    },
    recommendedAuthorityName: {
      type: String,
      default: '',
    },
    isDuplicate: {
      type: Boolean,
      default: false,
    },
    suggestedClusterId: {
      type: String,
      default: null,
    },
    relatedClusterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CommunityIssue',
      default: null,
    },
    clusterReason: {
      type: String,
      default: null,
    },
    sanitizedSummary: {
      type: String,
      default: '',
    },
    isOutOfScope: {
      type: Boolean,
      default: false,
    },
    outOfScopeReason: {
      type: String,
      default: null,
    },
    emergencyGuidance: {
      type: String,
      default: null,
    },
    engineUsed: {
      type: String,
      default: 'rule-fallback',
    },
    needsHumanReview: {
      type: Boolean,
      default: true,
    },
    evaluatedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const ComplaintSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: [true, 'Public complaint reference ID is required'],
      unique: true,
      uppercase: true,
      trim: true,
      match: [/^JS-\d{4}-\d{4,6}$/, 'Complaint ID must follow format JS-YYYY-XXXX'],
    },
    trackingCodeHash: {
      type: String,
      required: [true, 'Tracking code hash is required'],
      select: false,
    },
    title: {
      type: String,
      required: [true, 'Complaint title is required'],
      trim: true,
      minlength: 5,
      maxlength: 140,
    },
    description: {
      type: String,
      required: [true, 'Complaint description is required'],
      trim: true,
      minlength: 15,
      maxlength: 2500,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: CATEGORIES,
    },
    state: {
      type: String,
      default: 'Maharashtra',
      trim: true,
    },
    district: {
      type: String,
      default: 'Pune',
      trim: true,
    },
    area: {
      type: String,
      required: [true, 'Area or ward identifier is required'],
      trim: true,
    },
    preferredLanguage: {
      type: String,
      enum: LANGUAGE_NAMES,
      default: 'English',
    },
    preferredLanguageCode: {
      type: String,
      enum: LANGUAGE_CODES,
      default: 'en',
    },
    contactInfo: {
      type: String,
      default: 'Anonymous Demo Citizen',
      trim: true,
      select: false,
    },
    priority: {
      type: String,
      enum: PRIORITIES,
      default: 'Medium',
    },
    status: {
      type: String,
      required: true,
      enum: COMPLAINT_STATUSES,
      default: 'Submitted',
    },
    submittedDate: {
      type: String,
      required: true,
    },
    clusterId: {
      type: String,
      default: null,
    },
    clusterRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CommunityIssue',
      default: null,
    },
    assignedAuthorityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Authority',
      default: null,
    },
    recommendedAuthority: {
      type: String,
      default: '',
    },
    aiAnalysis: {
      type: AIAnalysisSchema,
      default: () => ({}),
    },
    humanReview: {
      type: HumanReviewSchema,
      default: () => ({}),
    },
    timeline: {
      type: [TimelineEventSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: 'complaints',
  }
);

ComplaintSchema.pre('validate', function syncLanguageCode() {
  if (this.preferredLanguage && LANGUAGE_NAME_TO_CODE[this.preferredLanguage]) {
    this.preferredLanguageCode = LANGUAGE_NAME_TO_CODE[this.preferredLanguage];
  }
});

ComplaintSchema.index({ trackingCodeHash: 1 });
ComplaintSchema.index({ category: 1, status: 1 });
ComplaintSchema.index({ area: 1, category: 1 });
ComplaintSchema.index({ district: 1 });
ComplaintSchema.index({ priority: 1 });
ComplaintSchema.index({ submittedDate: 1 });
ComplaintSchema.index({ clusterId: 1 });
ComplaintSchema.index({ status: 1, createdAt: -1 });
ComplaintSchema.index({ title: 'text', description: 'text', area: 'text' });

export const Complaint = mongoose.model('Complaint', ComplaintSchema);
