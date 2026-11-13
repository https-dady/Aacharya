import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

export const SUBMISSION_STATUSES = Object.freeze({
  SUBMITTED: 'SUBMITTED',
  LATE: 'LATE',
  GRADED: 'GRADED',
});

const submissionAttachmentSchema = new Schema(
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

    publicId: {
      type: String,
      trim: true,
      maxlength: [
        512,
        'Cloudinary public ID cannot exceed 512 characters.',
      ],
      default: undefined,
    },

    resourceType: {
      type: String,
      enum: ['image', 'raw', 'video'],
      default: undefined,
    },
  },
  {
    _id: true,
    id: false,
    strict: 'throw',
  },
);

const assignmentSubmissionSchema = new Schema(
  {
    assignment: {
      type: Schema.Types.ObjectId,
      ref: 'Assignment',
      required: [true, 'Assignment reference is required.'],
      immutable: true,
      index: true,
    },

    student: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student reference is required.'],
      immutable: true,
      index: true,
    },

    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course reference is required.'],
      immutable: true,
      index: true,
    },

    department: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department reference is required.'],
      immutable: true,
      index: true,
    },

    responseText: {
      type: String,
      trim: true,
      maxlength: [
        20000,
        'Submission response cannot exceed 20000 characters.',
      ],
      default: '',
    },

    attachments: {
      type: [submissionAttachmentSchema],
      default: [],
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length <= 10;
        },
        message: 'A submission can contain at most 10 attachments.',
      },
    },

    submittedAt: {
      type: Date,
      required: [true, 'Submission date is required.'],
      default: Date.now,
    },

    status: {
      type: String,
      enum: {
        values: Object.values(SUBMISSION_STATUSES),
        message: 'Invalid submission status.',
      },
      enum: Object.values(SUBMISSION_STATUSES),
      default: SUBMISSION_STATUSES.SUBMITTED,
      required: true,
      index: true,
    },

    marksObtained: {
      type: Number,
      min: [0, 'Obtained marks cannot be negative.'],
      default: null,
    },

    feedback: {
      type: String,
      trim: true,
      maxlength: [
        10000,
        'Feedback cannot exceed 10000 characters.',
      ],
      default: '',
    },

    evaluatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    evaluatedAt: {
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

assignmentSubmissionSchema.index(
  {
    assignment: 1,
    student: 1,
  },
  {
    unique: true,
    name: 'unique_assignment_student_submission',
  },
);

assignmentSubmissionSchema.index({
  course: 1,
  student: 1,
  submittedAt: -1,
});

assignmentSubmissionSchema.index({
  assignment: 1,
  status: 1,
  submittedAt: -1,
});

assignmentSubmissionSchema.index({
  department: 1,
  evaluatedBy: 1,
  evaluatedAt: -1,
});

export const AssignmentSubmission =
  models.AssignmentSubmission ||
  model('AssignmentSubmission', assignmentSubmissionSchema);