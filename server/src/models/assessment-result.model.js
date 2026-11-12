import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

export const ASSESSMENT_RESULT_STATUSES = Object.freeze({
  PENDING: 'PENDING',
  ENTERED: 'ENTERED',
  ABSENT: 'ABSENT',
  EXEMPT: 'EXEMPT',
});

const assessmentResultSchema = new Schema(
  {
    assessment: {
      type: Schema.Types.ObjectId,
      ref: 'Assessment',
      required: [true, 'Assessment reference is required.'],
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

    department: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department reference is required.'],
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

    batch: {
      type: Schema.Types.ObjectId,
      ref: 'Batch',
      default: null,
      immutable: true,
      index: true,
    },

    section: {
      type: Schema.Types.ObjectId,
      ref: 'Section',
      default: null,
      immutable: true,
      index: true,
    },

    totalMarks: {
      type: Number,
      required: [true, 'Assessment maximum marks are required.'],
      min: [
        0.01,
        'Assessment maximum marks must be greater than zero.',
      ],
      max: [
        10000,
        'Assessment maximum marks cannot exceed 10000.',
      ],
      immutable: true,
    },

    marksObtained: {
      type: Number,
      default: null,
      min: [
        0,
        'Obtained marks cannot be negative.',
      ],
      max: [
        10000,
        'Obtained marks cannot exceed 10000.',
      ],
    },

    status: {
      type: String,
      enum: {
        values: Object.values(ASSESSMENT_RESULT_STATUSES),
        message: 'Invalid assessment result status.',
      },
      required: true,
      default: ASSESSMENT_RESULT_STATUSES.PENDING,
      index: true,
    },

    remarks: {
      type: String,
      trim: true,
      maxlength: [
        1000,
        'Remarks cannot exceed 1000 characters.',
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

    publishedAt: {
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

assessmentResultSchema.pre('validate', function validateAssessmentResult() {
  if (
    this.marksObtained !== null &&
    this.marksObtained !== undefined &&
    this.marksObtained > this.totalMarks
  ) {
    this.invalidate(
      'marksObtained',
      'Obtained marks cannot exceed assessment maximum marks.',
    );
  }

  if (
    this.status === ASSESSMENT_RESULT_STATUSES.ENTERED &&
    (this.marksObtained === null || this.marksObtained === undefined)
  ) {
    this.invalidate(
      'marksObtained',
      'Marks are required for an entered result.',
    );
  }

  if (
    this.status === ASSESSMENT_RESULT_STATUSES.PENDING &&
    this.marksObtained !== null &&
    this.marksObtained !== undefined
  ) {
    this.invalidate(
      'marksObtained',
      'Pending results cannot contain obtained marks.',
    );
  }

  if (
    this.status === ASSESSMENT_RESULT_STATUSES.ABSENT &&
    this.marksObtained !== null &&
    this.marksObtained !== undefined
  ) {
    this.invalidate(
      'marksObtained',
      'Absent students cannot have obtained marks.',
    );
  }

  if (
    this.status === ASSESSMENT_RESULT_STATUSES.EXEMPT &&
    this.marksObtained !== null &&
    this.marksObtained !== undefined
  ) {
    this.invalidate(
      'marksObtained',
      'Exempt students cannot have obtained marks.',
    );
  }

  if (
    this.status === ASSESSMENT_RESULT_STATUSES.ENTERED &&
    !this.evaluatedBy
  ) {
    this.invalidate(
      'evaluatedBy',
      'Evaluator reference is required when marks are entered.',
    );
  }

  if (
    this.status === ASSESSMENT_RESULT_STATUSES.ENTERED &&
    !this.evaluatedAt
  ) {
    this.evaluatedAt = new Date();
  }

  if (
    this.status !== ASSESSMENT_RESULT_STATUSES.ENTERED &&
    this.evaluatedAt
  ) {
    this.evaluatedAt = null;
  }
});

// One student can have only one result record per assessment.
assessmentResultSchema.index(
  {
    assessment: 1,
    student: 1,
  },
  {
    unique: true,
    name: 'unique_student_assessment_result',
  },
);

assessmentResultSchema.index({
  department: 1,
  course: 1,
  student: 1,
});

assessmentResultSchema.index({
  department: 1,
  batch: 1,
  section: 1,
  assessment: 1,
});

assessmentResultSchema.index({
  assessment: 1,
  status: 1,
});

assessmentResultSchema.index({
  student: 1,
  createdAt: -1,
});

export const AssessmentResult =
  models.AssessmentResult ||
  model('AssessmentResult', assessmentResultSchema);