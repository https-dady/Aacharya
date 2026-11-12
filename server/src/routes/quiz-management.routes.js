import { Router } from 'express';
import { z } from 'zod';

import {
  listDepartmentQuizzesController,
  createDepartmentQuizController,
  updateDepartmentQuizController,
  deleteDepartmentQuizController,
} from '../controllers/quiz-management.controller.js';

import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { authRateLimiter } from '../middleware/rate-limit.middleware.js';
import { auditEvent } from '../middleware/audit.middleware.js';

import { QUIZ_STATUSES } from '../models/quiz.model.js';

const quizManagementRouter = Router();

const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'A valid MongoDB ID is required.');

const quizStatusSchema = z.enum(
  Object.values(QUIZ_STATUSES),
);

const questionSchema = z.object({
  question: z.string().trim().min(1).max(5000),

  options: z
    .array(z.string().trim().min(1).max(1000))
    .min(2)
    .max(10),

  correctOptionIndex: z.coerce
    .number()
    .int()
    .min(0)
    .max(9),

  marks: z.coerce
    .number()
    .int()
    .min(1)
    .max(1000),
}).strict().superRefine((question, context) => {
  if (question.correctOptionIndex >= question.options.length) {
    context.addIssue({
      code: 'custom',
      path: ['correctOptionIndex'],
      message: 'The correct option must refer to an existing option.',
    });
  }
});

const quizFieldsSchema = {
  title: z.string().trim().min(2).max(200).optional(),

  description: z.string().trim().max(10000).optional(),

  courseId: objectIdSchema.optional(),

  batchIds: z
    .array(objectIdSchema)
    .max(100)
    .optional(),

  sectionIds: z
    .array(objectIdSchema)
    .max(500)
    .optional(),

  startAt: z.coerce.date().optional(),

  endAt: z.coerce.date().optional(),

  durationMinutes: z.coerce
    .number()
    .int()
    .min(1)
    .max(1440)
    .optional(),

  questions: z
    .array(questionSchema)
    .min(1)
    .max(200)
    .optional(),

  status: quizStatusSchema.optional(),
};

const listQuizzesSchema = z.object({
  params: z.object({}).strict(),

  query: z.object({
    page: z.coerce.number().int().min(1).max(100000).optional(),

    limit: z.coerce.number().int().min(1).max(100).optional(),

    search: z.string().trim().max(100).optional(),

    status: quizStatusSchema.optional(),

    courseId: objectIdSchema.optional(),

    semester: z.string().trim().max(30).optional(),

    batchId: objectIdSchema.optional(),

    sectionId: objectIdSchema.optional(),
  }).strict(),

  body: z.object({}).strict(),
});

const createQuizSchema = z.object({
  params: z.object({}).strict(),

  query: z.object({}).strict(),

  body: z.object({
    ...quizFieldsSchema,

    title: quizFieldsSchema.title.unwrap(),

    courseId: objectIdSchema,

    startAt: z.coerce.date(),

    endAt: z.coerce.date(),

    durationMinutes: z.coerce
      .number()
      .int()
      .min(1)
      .max(1440),

    questions: z
      .array(questionSchema)
      .min(1)
      .max(200),
  }).strict(),
});

const updateQuizSchema = z.object({
  params: z.object({
    quizId: objectIdSchema,
  }).strict(),

  query: z.object({}).strict(),

  body: z.object(quizFieldsSchema).strict().refine(
    (body) => Object.keys(body).length > 0,
    {
      message: 'At least one field must be provided for an update.',
    },
  ),
});

const deleteQuizSchema = z.object({
  params: z.object({
    quizId: objectIdSchema,
  }).strict(),

  query: z.object({}).strict(),

  body: z.object({}).strict(),
});

const quizManagementRoles = authorize('HOD', 'FACULTY');

/**
 * List quizzes accessible to the authenticated HOD or Faculty.
 *
 * GET /api/v1/quizzes/manage
 */
quizManagementRouter.get(
  '/manage',
  authenticate,
  quizManagementRoles,
  validate(listQuizzesSchema),
  listDepartmentQuizzesController,
);

/**
 * Create a quiz for a course assigned to the authenticated user.
 *
 * POST /api/v1/quizzes/manage
 */
quizManagementRouter.post(
  '/manage',
  authenticate,
  quizManagementRoles,
  authRateLimiter,
  validate(createQuizSchema),

  auditEvent({
    action: 'QUIZ_CREATE',
    resourceType: 'Quiz',

    getMetadata: (req) => ({
      courseId: req.body.courseId,
      batchCount: req.body.batchIds?.length || 0,
      sectionCount: req.body.sectionIds?.length || 0,
      questionCount: req.body.questions?.length || 0,
    }),
  }),

  createDepartmentQuizController,
);

/**
 * Update a quiz accessible to the authenticated HOD or Faculty.
 *
 * PATCH /api/v1/quizzes/manage/:quizId
 */
quizManagementRouter.patch(
  '/manage/:quizId',
  authenticate,
  quizManagementRoles,
  authRateLimiter,
  validate(updateQuizSchema),

  auditEvent({
    action: 'QUIZ_UPDATE',
    resourceType: 'Quiz',

    getResourceId: (req) => req.params.quizId,

    getMetadata: (req) => ({
      updatedFields: Object.keys(req.body),
    }),
  }),

  updateDepartmentQuizController,
);

/**
 * Delete a quiz only when the controller confirms that no
 * student attempts exist.
 *
 * DELETE /api/v1/quizzes/manage/:quizId
 */
quizManagementRouter.delete(
  '/manage/:quizId',
  authenticate,
  quizManagementRoles,
  authRateLimiter,
  validate(deleteQuizSchema),

  auditEvent({
    action: 'QUIZ_DELETE',
    resourceType: 'Quiz',

    getResourceId: (req) => req.params.quizId,
  }),

  deleteDepartmentQuizController,
);

export default quizManagementRouter;