import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

const BATCH_STATUSES = Object.freeze({
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
});

const batchSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Batch name is required.'],
      trim: true,
      minlength: [2, 'Batch name must contain at least 2 characters.'],
      maxlength: [100, 'Batch name cannot exceed 100 characters.'],
    },

    code: {
      type: String,
      required: [true, 'Batch code is required.'],
      trim: true,
      uppercase: true,
      minlength: [2, 'Batch code must contain at least 2 characters.'],
      maxlength: [30, 'Batch code cannot exceed 30 characters.'],
      match: [
        /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/,
        'Batch code can contain uppercase letters, numbers, and hyphens.',
      ],
    },

    department: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department is required.'],
      index: true,
    },

    academicYear: {
      type: String,
      required: [true, 'Academic year is required.'],
      trim: true,
      match: [
        /^\d{4}-\d{4}$/,
        'Academic year must use the YYYY-YYYY format.',
      ],
      validate: {
        validator(value) {
          if (!/^\d{4}-\d{4}$/.test(value)) {
            return false;
          }

          const [startYear, endYear] = value.split('-').map(Number);

          return endYear === startYear + 1;
        },
        message: 'Academic year must contain consecutive years.',
      },
    },

    status: {
      type: String,
      enum: {
        values: Object.values(BATCH_STATUSES),
        message: 'Invalid batch status.',
      },
      default: BATCH_STATUSES.ACTIVE,
      index: true,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Batch creator is required.'],
      immutable: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    strict: 'throw',
  },
);

batchSchema.index(
  {
    department: 1,
    code: 1,
    academicYear: 1,
  },
  {
    unique: true,
  },
);

batchSchema.index({
  department: 1,
  status: 1,
  academicYear: 1,
});

export { BATCH_STATUSES };

export const Batch =
  models.Batch || model('Batch', batchSchema);