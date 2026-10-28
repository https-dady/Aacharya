import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

const QUIZ_ATTEMPT_STATUSES = Object.freeze({
  IN_PROGRESS: 'IN_PROGRESS',
  SUBMITTED: 'SUBMITTED',
  EXPIRED: 'EXPIRED',
});

const quizAttemptAnswerSchema = new Schema(
  {
    questionId: {
      type: Schema.Types.ObjectId,
      required: true,
    },

    selectedOptionIndex: {
      type: Number,
      default: null,
      min: 0,
      validate: {
        validator(value) {
          return value === null || Number.isInteger(value);
        },
        message: 'Selected option index must be an integer.',
      },
    },

    answeredAt: {
      type: Date,
      default: null,
    },
  },
  {
    _id: false,
  },
);

const quizAttemptSchema = new Schema(
  {
    quiz: {
      type: Schema.Types.ObjectId,
      ref: 'Quiz',
      required: true,
      index: true,
      immutable: true,
    },

    student: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
      immutable: true,
    },

    status: {
      type: String,
      enum: {
        values: Object.values(QUIZ_ATTEMPT_STATUSES),
        message: 'Invalid quiz attempt status.',
      },
      default: QUIZ_ATTEMPT_STATUSES.IN_PROGRESS,
      required: true,
      index: true,
    },

    startedAt: {
      type: Date,
      required: true,
      default: Date.now,
      immutable: true,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    submittedAt: {
      type: Date,
      default: null,
    },

    answers: {
      type: [quizAttemptAnswerSchema],
      default: [],
    },

    score: {
      type: Number,
      default: null,
      min: 0,
    },

    totalMarks: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    strict: 'throw',
  },
);

quizAttemptSchema.index({
  student: 1,
  quiz: 1,
  createdAt: -1,
});

quizAttemptSchema.index({
  status: 1,
  expiresAt: 1,
});

quizAttemptSchema.pre('validate', function validateQuizAttempt() {
  if (
    this.submittedAt &&
    this.startedAt &&
    this.submittedAt < this.startedAt
  ) {
    this.invalidate(
      'submittedAt',
      'Submission time cannot be earlier than the start time.',
    );
  }

  if (
    this.expiresAt &&
    this.startedAt &&
    this.expiresAt <= this.startedAt
  ) {
    this.invalidate(
      'expiresAt',
      'Expiry time must be later than the start time.',
    );
  }

  if (
    this.score !== null &&
    this.score !== undefined &&
    this.totalMarks !== undefined &&
    this.score > this.totalMarks
  ) {
    this.invalidate(
      'score',
      'Score cannot exceed the total marks.',
    );
  }

  if (
    this.status === QUIZ_ATTEMPT_STATUSES.SUBMITTED &&
    !this.submittedAt
  ) {
    this.invalidate(
      'submittedAt',
      'A submitted attempt must have a submission timestamp.',
    );
  }

  if (
    this.status === QUIZ_ATTEMPT_STATUSES.IN_PROGRESS &&
    this.submittedAt
  ) {
    this.invalidate(
      'submittedAt',
      'An in-progress attempt cannot have a submission timestamp.',
    );
  }
});

const QuizAttempt =
  models.QuizAttempt || model('QuizAttempt', quizAttemptSchema);

export {
  QuizAttempt,
  QUIZ_ATTEMPT_STATUSES,
};