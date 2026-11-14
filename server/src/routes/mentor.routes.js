import { Router } from 'express';
import { z } from 'zod';

import {
  assignMentorController,
  clearDepartmentMentorAssignmentsController,
  listMentorsController,
} from '../controllers/mentor.controller.js';

import {
  getMentorDashboardController,
} from '../controllers/mentor-dashboard.controller.js';

import {
  getMentorAttendanceOverviewController,
} from '../controllers/mentor-attendance-overview.controller.js';

import {
  getMentorSelfProfileController,
  updateMentorSelfProfileController,
} from '../controllers/mentor-self-profile.controller.js';

import {
  getMentorAssignedStudentsController,
} from '../controllers/mentor-assigned-students.controller.js';

import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { authRateLimiter } from '../middleware/rate-limit.middleware.js';
import { auditEvent } from '../middleware/audit.middleware.js';

import {
  ACCOUNT_STATUSES,
} from '../models/user.model.js';

const mentorRouter = Router();

const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'A valid MongoDB ID is required.');

const emptyObjectSchema = z.object({}).strict();

const mentorAttendanceOverviewSchema = z.object({
  params: emptyObjectSchema,
  body: emptyObjectSchema,
  query: z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }).strict(),
});

const assignMentorSchema = z.object({
  params: z.object({
    facultyId: objectIdSchema,
  }).strict(),

  body: z.object({
    batchIds: z.array(objectIdSchema).max(100),
    sectionIds: z.array(objectIdSchema).max(500),
  }).strict(),

  query: emptyObjectSchema,
});

const listMentorsSchema = z.object({
  params: emptyObjectSchema,
  body: emptyObjectSchema,

  query: z.object({
    page: z.coerce.number().int().min(1).max(100000).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    search: z.string().trim().max(100).optional(),
    status: z.enum([
      ACCOUNT_STATUSES.ACTIVE,
      ACCOUNT_STATUSES.SUSPENDED,
      ACCOUNT_STATUSES.DISABLED,
    ]).optional(),
  }).strict(),
});

const clearDepartmentMentorAssignmentsSchema = z.object({
  params: emptyObjectSchema,

  body: z.object({
    confirmation: z.literal(
      'CLEAR_DEPARTMENT_MENTOR_ASSIGNMENTS',
    ),
  }).strict(),

  query: emptyObjectSchema,
});

const updateMentorProfileSchema = z.object({
  params: emptyObjectSchema,
  query: emptyObjectSchema,

  body: z.object({
    fullName: z.string().trim().min(2).max(100).optional(),
    email: z.string().trim().email().max(254).optional(),
  })
    .strict()
    .refine(
      (body) => Object.keys(body).length > 0,
      {
        message: 'Provide at least one profile field to update.',
      },
    ),
});

/**
 * Mentor dashboard.
 */
mentorRouter.get(
  '/mentor/dashboard',
  authenticate,
  authorize('MENTOR'),
  authRateLimiter,
  getMentorDashboardController,
);

/**
 * GET /api/v1/provisioning/mentor/attendance-overview
 *
 * Returns attendance metrics only for the mentor's currently
 * assigned active sections and students assigned to those sections.
 */
mentorRouter.get(
  '/mentor/attendance-overview',
  authenticate,
  authorize('MENTOR'),
  authRateLimiter,
  validate(mentorAttendanceOverviewSchema),
  getMentorAttendanceOverviewController,
);

/**
 * GET /api/v1/provisioning/mentor/students
 *
 * Paginated students across all sections canonically assigned
 * to the authenticated mentor.
 */
mentorRouter.get(
  '/mentor/students',
  authenticate,
  authorize('MENTOR'),
  authRateLimiter,
  validate(z.object({
    params: z.object({}).strict(),
    body: z.object({}).strict(),
    query: z.object({
      page: z.coerce.number().int().min(1).max(100000).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
      search: z.string().trim().max(100).optional(),
      status: z.enum([
        ACCOUNT_STATUSES.ACTIVE,
        ACCOUNT_STATUSES.SUSPENDED,
        ACCOUNT_STATUSES.DISABLED,
      ]).optional(),
    }).strict(),
  })),
  getMentorAssignedStudentsController,
);

/**
 * Mentor self profile.
 */
mentorRouter.get(
  '/mentor/profile',
  authenticate,
  authorize('MENTOR'),
  getMentorSelfProfileController,
);

mentorRouter.patch(
  '/mentor/profile',
  authenticate,
  authorize('MENTOR'),
  authRateLimiter,
  validate(updateMentorProfileSchema),
  auditEvent({
    action: 'MENTOR_SELF_PROFILE_UPDATE',
    resourceType: 'MentorProfile',
    getResourceId: (req) => req.user?.id,
    getMetadata: (req) => ({
      updatedFields: Object.keys(req.body ?? {}),
    }),
  }),
  updateMentorSelfProfileController,
);

/**
 * HOD mentor management.
 */
mentorRouter.get(
  '/mentors',
  authenticate,
  authorize('HOD'),
  validate(listMentorsSchema),
  listMentorsController,
);

mentorRouter.patch(
  '/faculty/:facultyId/mentor',
  authenticate,
  authorize('HOD'),
  authRateLimiter,
  validate(assignMentorSchema),
  auditEvent({
    action: 'MENTOR_ASSIGNMENT_UPDATE',
    resourceType: 'FacultyMentorAssignment',
    getResourceId: (req) => req.params.facultyId,
    getMetadata: (req) => ({
      batchCount: req.body.batchIds.length,
      sectionCount: req.body.sectionIds.length,
    }),
  }),
  assignMentorController,
);

mentorRouter.post(
  '/mentors/assignments/clear-department',
  authenticate,
  authorize('HOD'),
  authRateLimiter,
  validate(clearDepartmentMentorAssignmentsSchema),
  auditEvent({
    action: 'DEPARTMENT_MENTOR_ASSIGNMENTS_CLEAR',
    resourceType: 'DepartmentMentorAssignments',
    getResourceId: (req) => req.user?.department
      ? String(req.user.department)
      : String(req.user?.id ?? 'unknown'),
    getMetadata: () => ({
      operation: 'CLEAR_DEPARTMENT_MENTOR_ASSIGNMENTS',
    }),
  }),
  clearDepartmentMentorAssignmentsController,
);

export default mentorRouter;