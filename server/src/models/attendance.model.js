import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

export const ATTENDANCE_STATUSES = Object.freeze({
  PRESENT: 'PRESENT',
  ABSENT: 'ABSENT',
  LATE: 'LATE',
});

const attendanceSchema = new Schema(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
      immutable: true,
    },

    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
      immutable: true,
    },

    batch: {
      type: Schema.Types.ObjectId,
      ref: 'Batch',
      default: null,
      index: true,
    },

    section: {
      type: Schema.Types.ObjectId,
      ref: 'Section',
      default: null,
      index: true,
    },

    sessionDate: {
      type: Date,
      required: true,
      index: true,
    },

    sessionKey: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    status: {
      type: String,
      enum: {
        values: Object.values(ATTENDANCE_STATUSES),
        message: 'Invalid attendance status.',
      },
      required: true,
      default: ATTENDANCE_STATUSES.PRESENT,
      index: true,
    },

    markedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      immutable: true,
    },

    remarks: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
  },
  {
    timestamps: true,
    versionKey: false,
    strict: 'throw',
  },
);

// A student can have only one attendance record per class session.
attendanceSchema.index(
  {
    student: 1,
    course: 1,
    sessionKey: 1,
  },
  {
    unique: true,
    name: 'unique_student_course_session_attendance',
  },
);

attendanceSchema.index({
  student: 1,
  sessionDate: -1,
});

attendanceSchema.index({
  course: 1,
  sessionDate: -1,
});

export const Attendance =
  models.Attendance || model('Attendance', attendanceSchema);