import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

const QUIZ_STATUSES = Object.freeze({
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  CLOSED: 'CLOSED',
});

const quizQuestionSchema = new Schema(
  {
    question: {
      type: String,
      required: [true, 'Question text is required.'],
      trim: true,
      maxlength: [
        5000,
        'Question text cannot exceed 5000 characters.',
      ],
    },

    options: {
      type: [
        {
          type: String,
          trim: true,
          maxlength: [
            1000,
            'An answer option cannot exceed 1000 characters.',
          ],
        },
      ],
      validate: {
        validator(options) {
          return Array.isArray(options) && options.length >= 2;
        },
        message: 'A multiple-choice question requires at least two options.',
      },
      required: true,
    },

    correctOptionIndex: {
      type: Number,
      required: [true, 'The correct option index is required.'],
      min: 0,
    },

    marks: {
      type: Number,
      required: [true, 'Question marks are required.'],
      min: [1, 'Question marks must be at least 1.'],
      max: [1000, 'Question marks cannot exceed 1000.'],
    },
  },
  {
    _id: true,
    versionKey: false,
    strict: 'throw',
  },
);

quizQuestionSchema.pre('validate', function validateCorrectOption() {
  if (
    Number.isInteger(this.correctOptionIndex)
    && Array.isArray(this.options)
    && this.correctOptionIndex >= this.options.length
  ) {
    this.invalidate(
      'correctOptionIndex',
      'The correct option index must refer to an existing option.',
    );
  }
});

const quizSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Quiz title is required.'],
      trim: true,
      minlength: [2, 'Quiz title must contain at least 2 characters.'],
      maxlength: [200, 'Quiz title cannot exceed 200 characters.'],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [
        10000,
        'Quiz description cannot exceed 10000 characters.',
      ],
      default: '',
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

    startAt: {
      type: Date,
      required: [true, 'Quiz start time is required.'],
    },

    endAt: {
      type: Date,
      required: [true, 'Quiz end time is required.'],
    },

    durationMinutes: {
      type: Number,
      required: [true, 'Quiz duration is required.'],
      min: [1, 'Quiz duration must be at least one minute.'],
      max: [1440, 'Quiz duration cannot exceed 24 hours.'],
    },

    totalMarks: {
      type: Number,
      required: [true, 'Quiz total marks are required.'],
      min: [1, 'Quiz total marks must be at least 1.'],
      max: [10000, 'Quiz total marks cannot exceed 10000.'],
    },

    questions: {
      type: [quizQuestionSchema],
      default: [],
    },

    status: {
      type: String,
      enum: {
        values: Object.values(QUIZ_STATUSES),
        message: 'Invalid quiz status.',
      },
      default: QUIZ_STATUSES.DRAFT,
      index: true,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Quiz creator is required.'],
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

quizSchema.pre('validate', function validateQuizSchedule() {
  if (
    this.startAt instanceof Date
    && this.endAt instanceof Date
    && !Number.isNaN(this.startAt.getTime())
    && !Number.isNaN(this.endAt.getTime())
    && this.endAt <= this.startAt
  ) {
    this.invalidate(
      'endAt',
      'Quiz end time must be later than its start time.',
    );
  }

  if (
    Array.isArray(this.questions)
    && this.questions.length > 0
  ) {
    const calculatedTotal = this.questions.reduce(
      (total, question) => total + (Number(question.marks) || 0),
      0,
    );

    if (calculatedTotal !== this.totalMarks) {
      this.invalidate(
        'totalMarks',
        'Total marks must equal the sum of the question marks.',
      );
    }
  }
});

quizSchema.index({
  course: 1,
  status: 1,
  startAt: 1,
});

quizSchema.index({
  department: 1,
  batches: 1,
  status: 1,
});

quizSchema.index({
  department: 1,
  sections: 1,
  status: 1,
});

quizSchema.index({
  createdBy: 1,
  status: 1,
  createdAt: -1,
});

export { QUIZ_STATUSES };

export const Quiz = models.Quiz || model('Quiz', quizSchema);