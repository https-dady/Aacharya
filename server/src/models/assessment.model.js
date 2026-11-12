import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

const ASSESSMENT_TYPES = Object.freeze({
  INTERNAL: 'INTERNAL',
  MID_TERM_1: 'MID_TERM_1',
  MID_TERM_2: 'MID_TERM_2',
  CLASS_TEST: 'CLASS_TEST',
  PRACTICAL: 'PRACTICAL',
  ASSIGNMENT: 'ASSIGNMENT',
  OTHER: 'OTHER',
});

const ASSESSMENT_STATUSES = Object.freeze({
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  CLOSED: 'CLOSED',
});

const assessmentSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Assessment title is required.'],
      trim: true,
      minlength: [
        2,
        'Assessment title must contain at least 2 characters.',
      ],
      maxlength: [
        200,
        'Assessment title cannot exceed 200 characters.',
      ],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [
        5000,
        'Assessment description cannot exceed 5000 characters.',
      ],
      default: '',
    },

    type: {
      type: String,
      required: [true, 'Assessment type is required.'],
      enum: {
        values: Object.values(ASSESSMENT_TYPES),
        message: 'Invalid assessment type.',
      },
      index: true,
    },

    department: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department is required.'],
      index: true,
      immutable: true,
    },

    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course is required.'],
      index: true,
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

    assessmentDate: {
      type: Date,
      required: [true, 'Assessment date is required.'],
      index: true,
    },

    totalMarks: {
      type: Number,
      required: [true, 'Total marks are required.'],
      min: [
        0.01,
        'Total marks must be greater than zero.',
      ],
      max: [
        10000,
        'Total marks cannot exceed 10000.',
      ],
    },

    passingMarks: {
      type: Number,
      required: [true, 'Passing marks are required.'],
      min: [
        0,
        'Passing marks cannot be negative.',
      ],
      default: 0,
    },

    status: {
      type: String,
      enum: {
        values: Object.values(ASSESSMENT_STATUSES),
        message: 'Invalid assessment status.',
      },
      default: ASSESSMENT_STATUSES.DRAFT,
      index: true,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Assessment creator is required.'],
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

assessmentSchema.pre('validate', function validateAssessmentMarks() {
  if (
    typeof this.totalMarks === 'number' &&
    typeof this.passingMarks === 'number' &&
    this.passingMarks > this.totalMarks
  ) {
    this.invalidate(
      'passingMarks',
      'Passing marks cannot exceed total marks.',
    );
  }
});

assessmentSchema.pre('validate', function validateAssessmentStatus() {
  if (
    this.status === ASSESSMENT_STATUSES.PUBLISHED &&
    !this.publishedAt
  ) {
    this.publishedAt = new Date();
  }

  if (
    this.status === ASSESSMENT_STATUSES.CLOSED &&
    !this.closedAt
  ) {
    this.closedAt = new Date();
  }
});

assessmentSchema.index({
  department: 1,
  course: 1,
  type: 1,
  assessmentDate: -1,
});

assessmentSchema.index({
  department: 1,
  status: 1,
  createdAt: -1,
});

assessmentSchema.index({
  department: 1,
  batches: 1,
  sections: 1,
});

assessmentSchema.index({
  course: 1,
  assessmentDate: -1,
});

export {
  ASSESSMENT_TYPES,
  ASSESSMENT_STATUSES,
};

export const Assessment =
  models.Assessment || model('Assessment', assessmentSchema);