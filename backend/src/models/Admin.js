import mongoose from 'mongoose';
import { ACTIVE_ROLES, ROLES } from '../config/constants.js';

const AdminSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Admin email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email address format'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false,
    },
    fullName: {
      type: String,
      required: [true, 'Admin full name is required'],
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    role: {
      type: String,
      required: true,
      enum: {
        values: ACTIVE_ROLES, // Strictly ['ADMIN'] for MVP; extensible for future RBAC
        message: 'Role {VALUE} is not permitted for MVP',
      },
      default: ROLES.ADMIN,
    },
    department: {
      type: String,
      default: 'Supervisory Desk',
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'admins',
  }
);

AdminSchema.index({ role: 1, isActive: 1 });

export const Admin = mongoose.model('Admin', AdminSchema);
