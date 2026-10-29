import { Router } from 'express';
import { z } from 'zod';

import {
  listHodAttendanceController,
  listHodAttendanceReportsController,
} from '../controllers/hod-attendance.controller.js';

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

const hodAttendanceRouter = Router();

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

const attendanceFiltersSchema = {
  ...paginationSchema,

  startDate: dateSchema.optional(),

  endDate: dateSchema.optional(),

  courseId: objectIdSchema.optional(),

  batchId: objectIdSchema.optional(),

  sectionId: objectIdSchema.optional(),

  status: attendanceStatusSchema.optional(),

  search: z
    .string()
    .trim()
    .max(100)
    .optional(),
};

const attendanceOverviewSchema = z.object({
  params: emptyObjectSchema,

  body: emptyObjectSchema,

  query: z.object({
    ...attendanceFiltersSchema,
  }).strict(),
});

const attendanceReportsSchema = z.object({
  params: emptyObjectSchema,

  body: emptyObjectSchema,

  query: z.object({
    ...attendanceFiltersSchema,

    section: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .optional(),
  }).strict(),
});

/**
 * GET /api/v1/attendance/manage
 *
 * Returns student-wise attendance summaries for the HOD's
 * department, including attendance percentages and students
 * below the attendance threshold.
 */
hodAttendanceRouter.get(
  '/manage',
  authenticate,
  authorize(USER_ROLES.HOD),
  authRateLimiter,
  validate(attendanceOverviewSchema),
  listHodAttendanceController,
);

/**
 * GET /api/v1/attendance/manage/reports
 *
 * Returns detailed attendance records for the HOD's department.
 */
hodAttendanceRouter.get(
  '/manage/reports',
  authenticate,
  authorize(USER_ROLES.HOD),
  authRateLimiter,
  validate(attendanceReportsSchema),
  listHodAttendanceReportsController,
);

export default hodAttendanceRouter;