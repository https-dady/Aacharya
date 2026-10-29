import { Router } from 'express';
import { z } from 'zod';

import {
  createDepartmentCourseController,
  listDepartmentCoursesController,
  listMyCoursesController,
} from '../controllers/course.controller.js';

import {
  listMyAssignedCoursesController,
} from '../controllers/faculty-course.controller.js';

import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { authRateLimiter } from '../middleware/rate-limit.middleware.js';
import { auditEvent } from '../middleware/audit.middleware.js';

import {
  COURSE_CATEGORIES,
  COURSE_STATUSES,
} from '../models/course.model.js';

const courseRouter = Router();

const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'A valid MongoDB ID is required.');

const courseCategorySchema = z.enum(
  Object.values(COURSE_CATEGORIES),
);

const courseStatusSchema = z.enum(
  Object.values(COURSE_STATUSES),
);

const listDepartmentCoursesSchema = z.object({
  params: z.object({}).strict(),

  body: z.object({}).strict(),

  query: z.object({
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

    search: z.string().trim().max(100).optional(),

    status: courseStatusSchema.optional(),
  }).strict(),
});

const createDepartmentCourseSchema = z.object({
  params: z.object({}).strict(),

  query: z.object({}).strict(),

  body: z.object({
    title: z.string().trim().min(2).max(150),

    code: z
      .string()
      .trim()
      .min(2)
      .max(30)
      .regex(
        /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/,
        'Course code can contain letters, numbers, and hyphen-separated segments.',
      ),

    description: z.string().trim().max(2000).optional(),

    instructorId: objectIdSchema.nullable().optional(),

    batchIds: z
      .array(objectIdSchema)
      .max(100)
      .optional(),

    sectionIds: z
      .array(objectIdSchema)
      .max(500)
      .optional(),

    semester: z.string().trim().max(30).optional(),

    category: courseCategorySchema.optional(),

    credits: z.coerce
      .number()
      .min(0)
      .max(30)
      .optional(),
  }).strict(),
});

/**
 * Retrieve courses assigned to the authenticated student.
 *
 * GET /api/v1/courses/me
 */
courseRouter.get(
  '/me',
  authenticate,
  authorize('STUDENT'),
  authRateLimiter,
  listMyCoursesController,
);

/**
 * Retrieve active courses assigned to the authenticated Faculty or HOD.
 *
 * GET /api/v1/courses/assigned-to-me
 */
courseRouter.get(
  '/assigned-to-me',
  authenticate,
  authorize('FACULTY', 'HOD'),
  authRateLimiter,
  listMyAssignedCoursesController,
);

/**
 * List courses belonging to the authenticated HOD's department.
 *
 * GET /api/v1/courses/department
 *
 * Query:
 * - page
 * - limit
 * - search
 * - status
 */
courseRouter.get(
  '/department',
  authenticate,
  authorize('HOD'),
  validate(listDepartmentCoursesSchema),
  listDepartmentCoursesController,
);

/**
 * Create a course in the authenticated HOD's department.
 *
 * POST /api/v1/courses/department
 *
 * instructorId can reference an active faculty member, mentor,
 * or the authenticated HOD themselves.
 */
courseRouter.post(
  '/department',
  authenticate,
  authorize('HOD'),
  authRateLimiter,
  validate(createDepartmentCourseSchema),

  auditEvent({
    action: 'COURSE_CREATE',
    resourceType: 'Course',

    getMetadata: (req) => ({
      courseCode: req.body.code.trim().toUpperCase(),
      category: req.body.category || COURSE_CATEGORIES.CORE,
      instructorAssigned: Boolean(req.body.instructorId),
      batchCount: req.body.batchIds?.length || 0,
      sectionCount: req.body.sectionIds?.length || 0,
    }),
  }),

  createDepartmentCourseController,
);

export default courseRouter;