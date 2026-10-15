import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

export const OTP_PURPOSES = Object.freeze({
  PASSWORD_RESET: 'PASSWORD_RESET',
  EMAIL_VERIFICATION: 'EMAIL_VERIFICATION',
});

const passwordResetOtpSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    purpose: {
      type: String,
      enum: Object.values(OTP_PURPOSES),
      required: true,
      immutable: true,
    },

    // Email address this challenge is intended to verify.
    // For password-reset challenges, this records the account email
    // used when the challenge was created.
    targetEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },

    otpHash: {
      type: String,
      required: true,
      select: false,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    attempts: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    resendCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    verifiedAt: {
      type: Date,
      default: null,
    },

    resetTokenHash: {
      type: String,
      default: null,
      select: false,
    },

    resetTokenExpiresAt: {
      type: Date,
      default: null,
    },

    consumedAt: {
      type: Date,
      default: null,
    },

    invalidatedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    strict: 'throw',
  },
);

passwordResetOtpSchema.index({
  user: 1,
  purpose: 1,
  createdAt: -1,
});

passwordResetOtpSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 },
);

export const PasswordResetOtp =
  models.PasswordResetOtp
  || model('PasswordResetOtp', passwordResetOtpSchema);