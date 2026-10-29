import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

const SECTION_STATUSES = Object.freeze({
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
});

const sectionSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Section name is required.'],
      trim: true,
      minlength: [1, 'Section name cannot be empty.'],
      maxlength: [50, 'Section name cannot exceed 50 characters.'],
    },

    code: {
      type: String,
      required: [true, 'Section code is required.'],
      trim: true,
      uppercase: true,
      minlength: [1, 'Section code cannot be empty.'],
      maxlength: [20, 'Section code cannot exceed 20 characters.'],
      match: [
        /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/,
        'Section code can contain uppercase letters, numbers, and hyphens.',
      ],
    },

    batch: {
      type: Schema.Types.ObjectId,
      ref: 'Batch',
      required: [true, 'Batch is required.'],
      index: true,
    },

    department: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department is required.'],
      index: true,
    },

    /*
     * Canonical section-level mentor ownership.
     *
     * One section stores at most one mentor reference.
     * null means the section currently has no assigned mentor.
     *
     * Optional ownership preserves compatibility with existing
     * section documents until their assignments are reconciled.
     */
    mentor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },

    status: {
      type: String,
      enum: {
        values: Object.values(SECTION_STATUSES),
        message: 'Invalid section status.',
      },
      default: SECTION_STATUSES.ACTIVE,
      index: true,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Section creator is required.'],
      immutable: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    strict: 'throw',
  },
);

// A section code must be unique within its batch.
sectionSchema.index(
  {
    batch: 1,
    code: 1,
  },
  {
    unique: true,
  },
);

sectionSchema.index({
  department: 1,
  batch: 1,
  status: 1,
});

// Useful when retrieving sections assigned to a particular mentor.
sectionSchema.index({
  department: 1,
  mentor: 1,
  status: 1,
});

export { SECTION_STATUSES };

export const Section =
  models.Section || model('Section', sectionSchema);