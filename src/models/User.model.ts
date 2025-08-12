/**
 * User MongoDB Model
 * Mongoose schema for users collection
 */

import { Permission, UserRole } from '@/enums/user.enum';
import mongoose, { Document, Schema } from 'mongoose';

// User document interface for MongoDB - Updated for marketing platform
export interface IUserDocument extends Document {
  email: string;
  username: string;
  displayName: string;
  passwordHash: string;
  avatar?: string;
  role: string; // UserRole
  permissions: string[]; // Permission[]
  organizationId?: string;
  isVerified: boolean;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// User schema - Updated for marketing platform
const userSchema = new Schema<IUserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      match: /^[a-zA-Z0-9_]+$/,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false, // Don't include in queries by default
    },
    avatar: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: [
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.ANALYST,
        UserRole.ONLY_VIEW,
        UserRole.CLIENT,
      ],
      default: UserRole.CLIENT,
    },
    permissions: {
      type: [String],
      default: [],
    },
    organizationId: {
      type: String,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = ret._id;
        delete ret._id;
        if (ret.__v !== undefined) {
          delete ret.__v;
        }
        if (ret.passwordHash !== undefined) {
          delete ret.passwordHash; // Never expose password
        }
        return ret;
      },
    },
  }
);

// Indexes for performance - Updated for marketing platform
// Note: email and username indexes are automatically created by unique: true
// userSchema.index({ email: 1 }); // Removed - auto-created by unique: true
// userSchema.index({ username: 1 }); // Removed - auto-created by unique: true
userSchema.index({ role: 1 });
userSchema.index({ organizationId: 1 });
userSchema.index({ isVerified: 1, isActive: 1 });
userSchema.index({ createdAt: -1 });

// Virtual for profile URL
userSchema.virtual('profileUrl').get(function (this: IUserDocument) {
  return `/users/${this.username}`;
});

// Instance methods - Updated for marketing platform
userSchema.methods.toProfileJSON = function (this: IUserDocument) {
  return {
    id: this._id,
    username: this.username,
    displayName: this.displayName,
    avatar: this.avatar,
    role: this.role,
    organizationId: this.organizationId,
    isVerified: this.isVerified,
    isActive: this.isActive,
    createdAt: this.createdAt,
  };
};

userSchema.methods.hasPermission = function (this: IUserDocument, permission: string) {
  return this.permissions.includes(permission);
};

userSchema.methods.hasRole = function (this: IUserDocument, role: string) {
  return this.role === role;
};

// Static methods - Updated for marketing platform
userSchema.statics.findByEmailOrUsername = function (identifier: string) {
  return this.findOne({
    $or: [{ email: identifier.toLowerCase() }, { username: identifier.toLowerCase() }],
  });
};

userSchema.statics.findByRole = function (role: string) {
  return this.find({ role, isActive: true });
};

userSchema.statics.findByOrganization = function (organizationId: string) {
  return this.find({ organizationId, isActive: true });
};

userSchema.statics.searchByQuery = function (query: string, limit: number = 20) {
  const searchRegex = new RegExp(query, 'i');
  return this.find({
    $or: [{ username: searchRegex }, { displayName: searchRegex }],
    isActive: true,
  }).limit(limit);
};

// Pre-save middleware
userSchema.pre('save', function (this: IUserDocument, next) {
  // Ensure email and username are lowercase
  if (this.email) {
    this.email = this.email.toLowerCase();
  }
  if (this.username) {
    this.username = this.username.toLowerCase();
  }

  // Set default permissions based on role
  if (this.isNew && this.permissions.length === 0) {
    switch (this.role) {
      case UserRole.ADMIN:
        this.permissions = [
          Permission.CAMPAIGNS_CREATE,
          Permission.CAMPAIGNS_EDIT,
          Permission.CAMPAIGNS_DELETE,
          Permission.CAMPAIGNS_VIEW,
          Permission.ANALYTICS_VIEW,
        ];
        break;
      case UserRole.MANAGER:
        this.permissions = [
          Permission.CAMPAIGNS_CREATE,
          Permission.CAMPAIGNS_EDIT,
          Permission.CAMPAIGNS_VIEW,
          Permission.ANALYTICS_VIEW,
        ];
        break;
      case UserRole.ANALYST:
        this.permissions = [
          Permission.CAMPAIGNS_VIEW,
          Permission.ANALYTICS_VIEW,
          Permission.ANALYTICS_EXPORT,
        ];
        break;
      case UserRole.ONLY_VIEW:
        this.permissions = [Permission.CAMPAIGNS_VIEW, Permission.ANALYTICS_VIEW];
        break;
      case UserRole.CLIENT:
      default:
        this.permissions = [Permission.CAMPAIGNS_VIEW];
        break;
    }
  }

  next();
});

// Create and export model
export const UserModel = mongoose.models.User || mongoose.model<IUserDocument>('User', userSchema);

export default UserModel;
