import { Router } from 'express';
import { z } from 'zod';

import {
  listFacultyAttendanceStudentsController,
} from '../controllers/faculty-attendance-students.controller.js';

import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { authRateLimiter } from '../middleware/rate-limit.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

import {
  USER_ROLES,
} from '../models/user.model.js';

const facultyAttendanceStudentsRouter = Router();

const emptyObjectSchema = z.object({}).strict();

const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'A valid MongoDB ID is required.');

const attendanceStudentsSchema = z.object({
  params: z.object({
    courseId: objectIdSchema,
  }).strict(),

  query: emptyObjectSchema,

  body: emptyObjectSchema,
});

facultyAttendanceStudentsRouter.get(
  '/faculty/:courseId/students',
  authenticate,
  authorize(USER_ROLES.FACULTY),
  authRateLimiter,
  validate(attendanceStudentsSchema),
  listFacultyAttendanceStudentsController,
);

export default facultyAttendanceStudentsRouter;