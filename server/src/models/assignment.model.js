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

const ASSIGNMENT_ATTACHMENT_RESOURCE_TYPES = Object.freeze({
  IMAGE: 'image',
  RAW: 'raw',
  VIDEO: 'video',
});

const assignmentAttachmentSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Attachment name is required.'],
      trim: true,
      maxlength: [
        255,
        'Attachment name cannot exceed 255 characters.',
      ],
    },

    url: {
      type: String,
      required: [true, 'Attachment URL is required.'],
      trim: true,
      maxlength: [
        2048,
        'Attachment URL cannot exceed 2048 characters.',
      ],
    },

    mimeType: {
      type: String,
      trim: true,
      maxlength: [
        150,
        'Attachment MIME type cannot exceed 150 characters.',
      ],
      default: '',
    },

    size: {
      type: Number,
      min: [0, 'Attachment size cannot be negative.'],
      default: 0,
    },

    // Cloudinary public ID. Optional to preserve compatibility
    // with existing attachments that were added using external URLs.
    publicId: {
      type: String,
      trim: true,
      maxlength: [
        512,
        'Cloudinary public ID cannot exceed 512 characters.',
      ],
      default: undefined,
    },

    // Cloudinary resource type is needed when deleting an asset.
    // It remains optional for manually supplied external URLs.
    resourceType: {
      type: String,
      enum: {
        values: Object.values(
          ASSIGNMENT_ATTACHMENT_RESOURCE_TYPES,
        ),
        message: 'Invalid attachment resource type.',
      },
      default: undefined,
    },
  },
  {
    _id: true,
    id: false,
    strict: 'throw',
  },
);

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
          return (
            value instanceof Date
            && !Number.isNaN(value.getTime())
          );
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
      type: [assignmentAttachmentSchema],
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
  ASSIGNMENT_ATTACHMENT_RESOURCE_TYPES,
  ASSIGNMENT_CONTENT_TYPES,
  ASSIGNMENT_STATUSES,
};

export const Assignment =
  models.Assignment || model('Assignment', assignmentSchema);