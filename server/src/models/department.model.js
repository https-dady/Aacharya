import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

const DEPARTMENT_STATUSES = Object.freeze({
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
});

const departmentSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Department name is required.'],
      trim: true,
      minlength: [2, 'Department name must contain at least 2 characters.'],
      maxlength: [120, 'Department name cannot exceed 120 characters.'],
    },

    code: {
      type: String,
      required: [true, 'Department code is required.'],
      trim: true,
      uppercase: true,
      minlength: [2, 'Department code must contain at least 2 characters.'],
      maxlength: [20, 'Department code cannot exceed 20 characters.'],
      match: [
        /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/,
        'Department code can contain uppercase letters, numbers, and hyphens.',
      ],
      unique: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: [
        500,
        'Department description cannot exceed 500 characters.',
      ],
      default: '',
    },

    hod: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      validate: {
        validator(value) {
          return value === null || value !== undefined;
        },
        message: 'Invalid HOD reference.',
      },
    },

    status: {
      type: String,
      enum: {
        values: Object.values(DEPARTMENT_STATUSES),
        message: 'Invalid department status.',
      },
      default: DEPARTMENT_STATUSES.ACTIVE,
      index: true,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Department creator is required.'],
      immutable: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    strict: 'throw',
  },
);

departmentSchema.index({ name: 1 });
departmentSchema.index({ status: 1, name: 1 });

export { DEPARTMENT_STATUSES };

export const Department =
  models.Department || model('Department', departmentSchema);