import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

const COURSE_CATEGORIES = Object.freeze({
  CORE: 'CORE',
  ELECTIVE: 'ELECTIVE',
});

const COURSE_STATUSES = Object.freeze({
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
});

const courseSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Course title is required.'],
      trim: true,
      minlength: [2, 'Course title must contain at least 2 characters.'],
      maxlength: [150, 'Course title cannot exceed 150 characters.'],
    },

    code: {
      type: String,
      required: [true, 'Course code is required.'],
      trim: true,
      uppercase: true,
      minlength: [2, 'Course code must contain at least 2 characters.'],
      maxlength: [30, 'Course code cannot exceed 30 characters.'],
      match: [
        /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/,
        'Course code can contain uppercase letters, numbers, and hyphens.',
      ],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [
        2000,
        'Course description cannot exceed 2000 characters.',
      ],
      default: '',
    },

    department: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department is required.'],
      index: true,
      immutable: true,
    },

    faculty: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
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

    semester: {
      type: String,
      trim: true,
      maxlength: [
        30,
        'Semester cannot exceed 30 characters.',
      ],
      default: '',
    },

    category: {
      type: String,
      enum: {
        values: Object.values(COURSE_CATEGORIES),
        message: 'Invalid course category.',
      },
      default: COURSE_CATEGORIES.CORE,
      required: true,
    },

    credits: {
      type: Number,
      min: [0, 'Course credits cannot be negative.'],
      max: [30, 'Course credits cannot exceed 30.'],
      default: 0,
    },

    status: {
      type: String,
      enum: {
        values: Object.values(COURSE_STATUSES),
        message: 'Invalid course status.',
      },
      default: COURSE_STATUSES.ACTIVE,
      index: true,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Course creator is required.'],
      immutable: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    strict: 'throw',
  },
);

courseSchema.index(
  {
    department: 1,
    code: 1,
  },
  {
    unique: true,
  },
);

courseSchema.index({
  department: 1,
  status: 1,
  title: 1,
});

courseSchema.index({
  faculty: 1,
  status: 1,
});

courseSchema.index({
  batches: 1,
  status: 1,
});

courseSchema.index({
  sections: 1,
  status: 1,
});

export { COURSE_CATEGORIES, COURSE_STATUSES };

export const Course =
  models.Course || model('Course', courseSchema);