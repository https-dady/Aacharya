import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

export const STUDENT_ACTIVATION_STATUSES = Object.freeze({
  PENDING: 'PENDING',
  CONSUMED: 'CONSUMED',
  REVOKED: 'REVOKED',
  LOCKED: 'LOCKED',
});

const studentActivationChallengeSchema = new Schema(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student account is required.'],
      immutable: true,
      index: true,
    },

    issuedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Issuing administrator is required.'],
      immutable: true,
    },

    department: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department is required.'],
      immutable: true,
    },

    batch: {
      type: Schema.Types.ObjectId,
      ref: 'Batch',
      required: [true, 'Academic batch is required.'],
      immutable: true,
    },

    section: {
      type: Schema.Types.ObjectId,
      ref: 'Section',
      required: [true, 'Section is required.'],
      immutable: true,
    },

    challengeHash: {
      type: String,
      required: [true, 'Challenge hash is required.'],
      select: false,
      unique: true,
      immutable: true,
      match: [
        /^[a-f0-9]{64}$/,
        'Challenge hash must be a SHA-256 hexadecimal digest.',
      ],
    },

    status: {
      type: String,
      enum: Object.values(STUDENT_ACTIVATION_STATUSES),
      required: true,
      default: STUDENT_ACTIVATION_STATUSES.PENDING,
    },

    expiresAt: {
      type: Date,
      required: [true, 'Challenge expiration time is required.'],
      index: true,
    },

    consumedAt: {
      type: Date,
      default: null,
    },

    revokedAt: {
      type: Date,
      default: null,
    },

    failedAttempts: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      max: 10,
    },

    lockedAt: {
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

studentActivationChallengeSchema.index({
  student: 1,
  status: 1,
  expiresAt: 1,
});

studentActivationChallengeSchema.index({
  issuedBy: 1,
  createdAt: -1,
});

studentActivationChallengeSchema.index({
  department: 1,
  batch: 1,
  section: 1,
  createdAt: -1,
});

export const StudentActivationChallenge =
  models.StudentActivationChallenge ||
  model(
    'StudentActivationChallenge',
    studentActivationChallengeSchema,
  );