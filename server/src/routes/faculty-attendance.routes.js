import { Router } from 'express';
import { z } from 'zod';

import {
  listFacultyAttendanceController,
  markFacultyAttendanceController,
} from '../controllers/faculty-attendance.controller.js';

import {
  listFacultyAttendanceStudentsController,
} from '../controllers/faculty-attendance-students.controller.js';

import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { authRateLimiter } from '../middleware/rate-limit.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

import {
  ATTENDANCE_STATUSES,
} from '../models/attendance.model.js';

import {
  USER_ROLES,
} from '../models/user.model.js';

const facultyAttendanceRouter = Router();

const emptyObjectSchema = z.object({}).strict();

const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'A valid MongoDB ID is required.');

const dateSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}$/,
    'Date must use YYYY-MM-DD format.',
  );

const attendanceStatusSchema = z.enum(
  Object.values(ATTENDANCE_STATUSES),
);

const paginationSchema = {
  page: z.coerce
    .number()
    .int()
    .min(1)
    .max(100000)
    .optional(),

  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .optional(),
};

const attendanceStudentsSchema = z.object({
  params: z.object({
    courseId: objectIdSchema,
  }).strict(),

  query: emptyObjectSchema,

  body: emptyObjectSchema,
});

const attendanceListSchema = z.object({
  params: z.object({
    courseId: objectIdSchema,
  }).strict(),

  body: emptyObjectSchema,

  query: z.object({
    ...paginationSchema,

    startDate: dateSchema.optional(),

    endDate: dateSchema.optional(),

    batchId: objectIdSchema.optional(),

    sectionId: objectIdSchema.optional(),

    status: attendanceStatusSchema.optional(),
  }).strict(),
});

const attendanceEntrySchema = z.object({
  studentId: objectIdSchema,

  status: attendanceStatusSchema,

  remarks: z
    .string()
    .trim()
    .max(500)
    .optional()
    .default(''),
}).strict();

const markAttendanceSchema = z.object({
  params: z.object({
    courseId: objectIdSchema,
  }).strict(),

  query: emptyObjectSchema,

  body: z.object({
    sessionDate: dateSchema,

    sessionKey: z
      .string()
      .trim()
      .min(1)
      .max(100),

    records: z
      .array(attendanceEntrySchema)
      .min(1)
      .max(200),
  }).strict(),
});

/**
 * GET /api/v1/attendance/faculty/:courseId/students
 *
 * Lists eligible students for an assigned course.
 */
facultyAttendanceRouter.get(
  '/faculty/:courseId/students',
  authenticate,
  authorize(USER_ROLES.FACULTY),
  authRateLimiter,
  validate(attendanceStudentsSchema),
  listFacultyAttendanceStudentsController,
);

/**
 * GET /api/v1/attendance/faculty/:courseId
 *
 * Lists attendance records belonging to an assigned course.
 */
facultyAttendanceRouter.get(
  '/faculty/:courseId',
  authenticate,
  authorize(USER_ROLES.FACULTY),
  authRateLimiter,
  validate(attendanceListSchema),
  listFacultyAttendanceController,
);

/**
 * POST /api/v1/attendance/faculty/:courseId
 *
 * Creates or updates attendance records for eligible students.
 */
facultyAttendanceRouter.post(
  '/faculty/:courseId',
  authenticate,
  authorize(USER_ROLES.FACULTY),
  authRateLimiter,
  validate(markAttendanceSchema),
  markFacultyAttendanceController,
);

export default facultyAttendanceRouter;