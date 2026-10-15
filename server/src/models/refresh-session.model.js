import mongoose from 'mongoose';
import crypto from 'node:crypto';

const { Schema, model, models } = mongoose;

const refreshSessionSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    familyId: {
      type: String,
      required: true,
      default: () => crypto.randomUUID(),
      index: true,
    },

    tokenHash: {
      type: String,
      required: true,
      unique: true,
      select: false,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    revokedAt: {
      type: Date,
      default: null,
    },

    replacedByTokenHash: {
      type: String,
      default: null,
      select: false,
    },

    userAgent: {
      type: String,
      maxlength: 500,
      default: null,
    },

    ipAddress: {
      type: String,
      maxlength: 100,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    strict: 'throw',
  },
);

// Automatically remove expired refresh sessions.
refreshSessionSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 },
);

// Support queries for a user's sessions.
refreshSessionSchema.index({
  user: 1,
  revokedAt: 1,
});

// Support revocation of every session in a token family.
refreshSessionSchema.index({
  familyId: 1,
  revokedAt: 1,
});

export const RefreshSession =
  models.RefreshSession ||
  model('RefreshSession', refreshSessionSchema);