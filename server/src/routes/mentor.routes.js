import { Router } from 'express';
import { z } from 'zod';

import {
  assignMentorController,
  clearDepartmentMentorAssignmentsController,
  listMentorsController,
} from '../controllers/mentor.controller.js';

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

const assignMentorSchema = z.object({
  params: z.object({
    facultyId: objectIdSchema,
  }).strict(),

  body: z.object({
    batchIds: z.array(objectIdSchema).max(100),
    sectionIds: z.array(objectIdSchema).max(500),
  }).strict(),

  query: z.object({}),
});

const listMentorsSchema = z.object({
  params: z.object({}),

  body: z.object({}),

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

    status: z
      .enum([
        ACCOUNT_STATUSES.ACTIVE,
        ACCOUNT_STATUSES.SUSPENDED,
        ACCOUNT_STATUSES.DISABLED,
      ])
      .optional(),
  }).strict(),
});

/*
 * Department-wide unassignment requires an explicit confirmation
 * value to reduce the risk of accidental bulk changes.
 */
const clearDepartmentMentorAssignmentsSchema = z.object({
  params: z.object({}),

  body: z.object({
    confirmation: z.literal(
      'CLEAR_DEPARTMENT_MENTOR_ASSIGNMENTS',
    ),
  }).strict(),

  query: z.object({}),
});

/*
 * GET /api/v1/provisioning/mentors
 *
 * Retrieves mentors belonging to the authenticated HOD's
 * department. Authorization and department scoping are enforced
 * by the middleware and controller.
 */
mentorRouter.get(
  '/mentors',
  authenticate,
  authorize('HOD'),
  validate(listMentorsSchema),
  listMentorsController,
);

/*
 * PATCH /api/v1/provisioning/faculty/:facultyId/mentor
 *
 * Grants the Mentor role to an eligible faculty member or updates
 * an existing mentor's complete batch and section assignments.
 */
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

/*
 * POST /api/v1/provisioning/mentors/assignments/clear-department
 *
 * Clears all mentor-to-section assignments within the authenticated
 * HOD's department.
 *
 * Important:
 * - Faculty accounts are not deleted or disabled.
 * - Mentor roles are not removed.
 * - Assignments belonging to other departments are untouched.
 * - Explicit confirmation is required.
 * - The controller executes the operation transactionally.
 */
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