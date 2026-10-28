import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

const ASSIGNMENT_STATUSES = Object.freeze({
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  CLOSED: 'CLOSED',
});

const assignmentSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Assignment title is required.'],
      trim: true,
      minlength: [2, 'Assignment title must contain at least 2 characters.'],
      maxlength: [200, 'Assignment title cannot exceed 200 characters.'],
    },

    description: {
      type: String,
      required: [true, 'Assignment description is required.'],
      trim: true,
      minlength: [1, 'Assignment description cannot be empty.'],
      maxlength: [
        10000,
        'Assignment description cannot exceed 10000 characters.',
      ],
    },

    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course is required.'],
      index: true,
    },

    department: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department is required.'],
      index: true,
      immutable: true,
    },

    batches: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: 'Batch',
        },
      ],
      default: [],
    },

    sections: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: 'Section',
        },
      ],
      default: [],
    },

    dueDate: {
      type: Date,
      required: [true, 'Assignment due date is required.'],
      validate: {
        validator(value) {
          return value instanceof Date && !Number.isNaN(value.getTime());
        },
        message: 'Assignment due date must be valid.',
      },
    },

    totalMarks: {
      type: Number,
      required: [true, 'Assignment total marks are required.'],
      min: [1, 'Assignment total marks must be at least 1.'],
      max: [10000, 'Assignment total marks cannot exceed 10000.'],
    },

    attachments: {
      type: [
        {
          name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 255,
          },

          url: {
            type: String,
            required: true,
            trim: true,
            maxlength: 2048,
          },

          mimeType: {
            type: String,
            trim: true,
            maxlength: 150,
            default: '',
          },

          size: {
            type: Number,
            min: 0,
            default: 0,
          },
        },
      ],
      default: [],
    },

    status: {
      type: String,
      enum: {
        values: Object.values(ASSIGNMENT_STATUSES),
        message: 'Invalid assignment status.',
      },
      default: ASSIGNMENT_STATUSES.DRAFT,
      index: true,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Assignment creator is required.'],
      immutable: true,
    },

    publishedAt: {
      type: Date,
      default: null,
    },

    closedAt: {
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

assignmentSchema.index({
  course: 1,
  status: 1,
  dueDate: 1,
});

assignmentSchema.index({
  department: 1,
  batches: 1,
  status: 1,
});

assignmentSchema.index({
  department: 1,
  sections: 1,
  status: 1,
});

assignmentSchema.index({
  createdBy: 1,
  status: 1,
  createdAt: -1,
});

export { ASSIGNMENT_STATUSES };

export const Assignment =
  models.Assignment || model('Assignment', assignmentSchema);