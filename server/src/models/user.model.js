import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

const USER_ROLES = Object.freeze({
  SUPER_ADMIN: 'SUPER_ADMIN',
  HOD: 'HOD',
  FACULTY: 'FACULTY',
  MENTOR: 'MENTOR',
  STUDENT: 'STUDENT',
  ALUMNI: 'ALUMNI',
});

const ACCOUNT_STATUSES = Object.freeze({
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  DISABLED: 'DISABLED',
});

const userSchema = new Schema(
  {
    institutionalId: {
      type: String,
      required: [true, 'Institutional ID is required.'],
      trim: true,
      uppercase: true,
      minlength: [2, 'Institutional ID must contain at least 2 characters.'],
      maxlength: [50, 'Institutional ID cannot exceed 50 characters.'],
      unique: true,
      immutable: true,
    },

    fullName: {
      type: String,
      required: [true, 'Full name is required.'],
      trim: true,
      minlength: [2, 'Full name must contain at least 2 characters.'],
      maxlength: [100, 'Full name cannot exceed 100 characters.'],
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: [254, 'Email cannot exceed 254 characters.'],
      default: undefined,
      validate: {
        validator(value) {
          if (value === undefined || value === null || value === '') {
            return true;
          }

          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        },
        message: 'Please provide a valid email address.',
      },
    },

    passwordHash: {
      type: String,
      required: [true, 'Password hash is required.'],
      select: false,
    },

    role: {
      type: String,
      required: [true, 'User role is required.'],
      enum: {
        values: Object.values(USER_ROLES),
        message: 'Invalid user role.',
      },
    },

    status: {
      type: String,
      enum: {
        values: Object.values(ACCOUNT_STATUSES),
        message: 'Invalid account status.',
      },
      default: ACCOUNT_STATUSES.ACTIVE,
      index: true,
    },

    department: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
      index: true,
    },

    assignedBatches: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: 'Batch',
        },
      ],
      default: [],
    },

    assignedSections: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: 'Section',
        },
      ],
      default: [],
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      immutable: true,
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    emailVerifiedAt: {
      type: Date,
      default: null,
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },

    passwordChangedAt: {
      type: Date,
      default: null,
    },

    tokenVersion: {
      type: Number,
      default: 0,
      min: 0,
      select: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    strict: 'throw',
    toJSON: {
      transform(_document, result) {
        delete result.passwordHash;
        delete result.tokenVersion;

        return result;
      },
    },
  },
);

userSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: {
      email: { $type: 'string' },
    },
  },
);

userSchema.index({ department: 1, role: 1, status: 1 });

userSchema.index({ createdBy: 1 });

userSchema.index({ assignedBatches: 1 });

userSchema.index({ assignedSections: 1 });

userSchema.pre('validate', function validateEmailVerification() {
  if (this.isEmailVerified && !this.email) {
    this.invalidate(
      'isEmailVerified',
      'An email address is required for email verification.',
    );
  }

  if (this.isEmailVerified && !this.emailVerifiedAt) {
    this.emailVerifiedAt = new Date();
  }

  if (!this.isEmailVerified) {
    this.emailVerifiedAt = null;
  }
});

export { USER_ROLES, ACCOUNT_STATUSES };

export const User =
  models.User || model('User', userSchema);