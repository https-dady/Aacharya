import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

const STUDENT_IMPORT_BATCH_STATUSES = Object.freeze({
  COMPLETED: 'COMPLETED',
});

const studentImportBatchSchema = new Schema(
  {
    mentor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Importing mentor is required.'],
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

    idempotencyKey: {
      type: String,
      required: [true, 'Idempotency key is required.'],
      trim: true,
      minlength: [16, 'Idempotency key must contain at least 16 characters.'],
      maxlength: [128, 'Idempotency key cannot exceed 128 characters.'],
      immutable: true,
    },

    payloadHash: {
      type: String,
      required: [true, 'Import payload hash is required.'],
      match: [
        /^[a-f0-9]{64}$/,
        'Payload hash must be a SHA-256 hexadecimal digest.',
      ],
      immutable: true,
    },

    status: {
      type: String,
      enum: Object.values(STUDENT_IMPORT_BATCH_STATUSES),
      required: true,
      default: STUDENT_IMPORT_BATCH_STATUSES.COMPLETED,
      immutable: true,
    },

    importedCount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
      immutable: true,
    },

    studentIds: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
      default: [],
      immutable: true,
    },

    completedAt: {
      type: Date,
      required: true,
      default: Date.now,
      immutable: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    strict: 'throw',
  },
);

/*
 * A mentor can reuse an idempotency key in a different section,
 * but cannot use the same key twice for the same section.
 *
 * The unique index is the database-level protection against
 * concurrent requests attempting to register the same import.
 */
studentImportBatchSchema.index(
  {
    mentor: 1,
    section: 1,
    idempotencyKey: 1,
  },
  {
    unique: true,
    name: 'uniq_mentor_section_import_idempotency',
  },
);

studentImportBatchSchema.index({
  mentor: 1,
  section: 1,
  completedAt: -1,
});

export {
  STUDENT_IMPORT_BATCH_STATUSES,
};

export const StudentImportBatch =
  models.StudentImportBatch ||
  model('StudentImportBatch', studentImportBatchSchema);