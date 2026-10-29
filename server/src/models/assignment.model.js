import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

const ASSIGNMENT_CONTENT_TYPES = Object.freeze({
  ASSIGNMENT: 'ASSIGNMENT',
  PRACTICAL: 'PRACTICAL',
});

const ASSIGNMENT_STATUSES = Object.freeze({
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  CLOSED: 'CLOSED',
});

const assignmentSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required.'],
      trim: true,
      minlength: [2, 'Title must contain at least 2 characters.'],
      maxlength: [200, 'Title cannot exceed 200 characters.'],
    },

    contentType: {
      type: String,
      enum: {
        values: Object.values(ASSIGNMENT_CONTENT_TYPES),
        message: 'Invalid content type.',
      },
      default: ASSIGNMENT_CONTENT_TYPES.ASSIGNMENT,
      required: true,
      index: true,
    },

    description: {
      type: String,
      required: [true, 'Description is required.'],
      trim: true,
      minlength: [1, 'Description cannot be empty.'],
      maxlength: [
        10000,
        'Description cannot exceed 10000 characters.',
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
      required: [true, 'Due date is required.'],
      validate: {
        validator(value) {
          return value instanceof Date && !Number.isNaN(value.getTime());
        },
        message: 'Due date must be valid.',
      },
    },

    totalMarks: {
      type: Number,
      required: [true, 'Total marks are required.'],
      min: [1, 'Total marks must be at least 1.'],
      max: [10000, 'Total marks cannot exceed 10000.'],
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
      required: [true, 'Creator is required.'],
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

assignmentSchema.index({
  department: 1,
  contentType: 1,
  status: 1,
  createdAt: -1,
});

export {
  ASSIGNMENT_CONTENT_TYPES,
  ASSIGNMENT_STATUSES,
};

export const Assignment =
  models.Assignment || model('Assignment', assignmentSchema);