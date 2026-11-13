import { Router } from 'express';
import { z } from 'zod';

import {
  listMyAssignmentsController,
} from '../controllers/student-assignment.controller.js';

import {
  getMyAssignmentSubmissionController,
  submitAssignmentController,
} from '../controllers/student-assignment-submission.controller.js';

import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { authRateLimiter } from '../middleware/rate-limit.middleware.js';

const studentAssignmentRouter = Router();

const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'A valid MongoDB ID is required.');

const emptyObjectSchema = z.object({}).strict();

const attachmentSchema = z.object({
  name: z.string().trim().min(1).max(255),
  url: z.string().trim().url().max(2048),
  mimeType: z.string().trim().max(150).optional(),
  size: z.coerce.number().min(0).optional(),
  publicId: z.string().trim().max(512).optional(),
  resourceType: z.enum(['image', 'raw', 'video']).optional(),
}).strict();

const assignmentParamsSchema = z.object({
  assignmentId: objectIdSchema,
}).strict();

const getSubmissionSchema = z.object({
  params: assignmentParamsSchema,
  query: emptyObjectSchema,
  body: emptyObjectSchema,
});

const submitAssignmentSchema = z.object({
  params: assignmentParamsSchema,
  query: emptyObjectSchema,
  body: z.object({
    responseText: z.string().trim().max(20000).optional(),
    attachments: z.array(attachmentSchema).max(10).optional(),
  }).strict(),
});

/**
 * GET /api/v1/assignments/me
 *
 * List published assignments available to the authenticated student.
 */
studentAssignmentRouter.get(
  '/me',
  authenticate,
  authorize('STUDENT'),
  authRateLimiter,
  listMyAssignmentsController,
);

/**
 * GET /api/v1/assignments/:assignmentId/my-submission
 *
 * Retrieve the authenticated student's submission for an assignment.
 */
studentAssignmentRouter.get(
  '/:assignmentId/my-submission',
  authenticate,
  authorize('STUDENT'),
  authRateLimiter,
  validate(getSubmissionSchema),
  getMyAssignmentSubmissionController,
);

/**
 * POST /api/v1/assignments/:assignmentId/submit
 *
 * Submit or update the authenticated student's assignment response.
 */
studentAssignmentRouter.post(
  '/:assignmentId/submit',
  authenticate,
  authorize('STUDENT'),
  authRateLimiter,
  validate(submitAssignmentSchema),
  submitAssignmentController,
);

export default studentAssignmentRouter;