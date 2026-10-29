import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

export const TIMETABLE_DAYS = Object.freeze({
  MONDAY: 'Monday',
  TUESDAY: 'Tuesday',
  WEDNESDAY: 'Wednesday',
  THURSDAY: 'Thursday',
  FRIDAY: 'Friday',
  SATURDAY: 'Saturday',
});

export const TIMETABLE_STATUSES = Object.freeze({
  ACTIVE: 'ACTIVE',
  CANCELLED: 'CANCELLED',
});

const timetableSchema = new Schema(
  {
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

    faculty: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Faculty is required.'],
      index: true,
    },

    batch: {
      type: Schema.Types.ObjectId,
      ref: 'Batch',
      required: [true, 'Batch is required.'],
      index: true,
    },

    section: {
      type: Schema.Types.ObjectId,
      ref: 'Section',
      required: [true, 'Section is required.'],
      index: true,
    },

    day: {
      type: String,
      enum: {
        values: Object.values(TIMETABLE_DAYS),
        message: 'Invalid timetable weekday.',
      },
      required: [true, 'Weekday is required.'],
      index: true,
    },

    startTime: {
      type: String,
      required: [true, 'Start time is required.'],
      match: [
        /^([01]\d|2[0-3]):[0-5]\d$/,
        'Start time must use HH:mm format.',
      ],
    },

    endTime: {
      type: String,
      required: [true, 'End time is required.'],
      match: [
        /^([01]\d|2[0-3]):[0-5]\d$/,
        'End time must use HH:mm format.',
      ],
      validate: {
        validator(value) {
          if (!this.startTime || !value) {
            return true;
          }

          return value > this.startTime;
        },
        message: 'End time must be later than start time.',
      },
    },

    room: {
      type: String,
      required: [true, 'Classroom is required.'],
      trim: true,
      minlength: [1, 'Classroom cannot be empty.'],
      maxlength: [100, 'Classroom cannot exceed 100 characters.'],
    },

    status: {
      type: String,
      enum: {
        values: Object.values(TIMETABLE_STATUSES),
        message: 'Invalid timetable status.',
      },
      default: TIMETABLE_STATUSES.ACTIVE,
      required: true,
      index: true,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Timetable creator is required.'],
      immutable: true,
    },

    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    strict: 'throw',
  },
);

// Efficient department timetable queries.
timetableSchema.index({
  department: 1,
  day: 1,
  status: 1,
  startTime: 1,
});

// Efficient faculty schedule queries.
timetableSchema.index({
  faculty: 1,
  day: 1,
  status: 1,
  startTime: 1,
});

// Efficient classroom schedule queries.
timetableSchema.index({
  department: 1,
  room: 1,
  day: 1,
  status: 1,
  startTime: 1,
});

// Efficient batch and section timetable queries.
timetableSchema.index({
  batch: 1,
  section: 1,
  day: 1,
  status: 1,
  startTime: 1,
});

export const Timetable =
  models.Timetable || model('Timetable', timetableSchema);