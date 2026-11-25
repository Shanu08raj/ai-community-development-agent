import mongoose from 'mongoose';
import { CATEGORIES } from '../config/constants.js';

const AuthoritySchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      match: [/^AUTH-\d{2}$/, 'Authority ID must follow format AUTH-XX'],
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    department: {
      type: String,
      required: true,
      enum: CATEGORIES,
    },
    jurisdiction: {
      type: String,
      required: true,
      trim: true,
    },
    nodalOfficer: {
      type: String,
      default: 'Designated Officer',
      trim: true,
    },
    contactPhone: {
      type: String,
      required: true,
    },
    contactEmail: {
      type: String,
      required: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid authority email format'],
    },
    officeHours: {
      type: String,
      default: '09:30 AM - 05:30 PM (Mon-Sat)',
    },
    responseTimeAvg: {
      type: String,
      default: '48 hours',
    },
    activeIssuesCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    collection: 'authorities',
  }
);

AuthoritySchema.index({ department: 1 });

export const Authority = mongoose.model('Authority', AuthoritySchema);
