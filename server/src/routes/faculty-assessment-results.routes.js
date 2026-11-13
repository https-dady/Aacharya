import { Router } from 'express';
import { z } from 'zod';

import {
  listFacultyAcademicResultsController,
} from '../controllers/faculty-assessment-results.controller.js';

import {
  listFacultyAssessmentResultDetailsController,
} from '../controllers/faculty-assessment-result-details.controller.js';

import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

import {
  ASSESSMENT_TYPES,
  ASSESSMENT_STATUSES,
} from '../models/assessment.model.js';

import {
  ASSESSMENT_RESULT_STATUSES,
} from '../models/assessment-result.model.js';

import {
  USER_ROLES,
} from '../models/user.model.js';

const facultyAssessmentResultsRouter = Router();

const objectIdSchema = z
  .string()
  .regex(
    /^[a-f\d]{24}$/i,
    'A valid MongoDB identifier is required.',
  );

const emptyObjectSchema = z.object({}).strict();

const positiveIntegerQuerySchema = z
  .string()
  .regex(
    /^[1-9]\d*$/,
    'Must be a positive integer.',
  )
  .transform(Number)
  .refine(Number.isSafeInteger, {
    message: 'Must be a safe integer.',
  });

const assessmentTypeSchema = z.enum(
  Object.values(ASSESSMENT_TYPES),
);

const assessmentStatusSchema = z.enum(
  Object.values(ASSESSMENT_STATUSES),
);

const assessmentResultStatusSchema = z.enum(
  Object.values(ASSESSMENT_RESULT_STATUSES),
);

/**
 * GET /api/v1/assessments/faculty
 *
 * Lists academic assessments and result summaries
 * accessible to the authenticated Faculty member.
 */
const listFacultyAcademicResultsSchema = z.object({
  params: emptyObjectSchema,

  query: z
    .object({
      page: positiveIntegerQuerySchema.optional(),

      limit: positiveIntegerQuerySchema
        .refine((value) => value <= 100, {
          message: 'Limit cannot exceed 100.',
        })
        .optional(),

      search: z
        .string()
        .trim()
        .max(200)
        .optional(),

      type: assessmentTypeSchema.optional(),

      status: assessmentStatusSchema.optional(),

      courseId: objectIdSchema.optional(),

      startDate: z
        .string()
        .datetime()
        .optional(),

      endDate: z
        .string()
        .datetime()
        .optional(),
    })
    .strict()
    .refine(
      (query) =>
        !query.startDate ||
        !query.endDate ||
        new Date(query.startDate) <= new Date(query.endDate),
      {
        message: 'End date must be on or after start date.',
        path: ['endDate'],
      },
    ),

  body: emptyObjectSchema,
});

/**
 * GET /api/v1/assessments/faculty/:assessmentId/results
 *
 * Lists student-wise results for an assessment
 * accessible to the authenticated Faculty member.
 */
const listFacultyAssessmentResultDetailsSchema = z.object({
  params: z
    .object({
      assessmentId: objectIdSchema,
    })
    .strict(),

  query: z
    .object({
      page: positiveIntegerQuerySchema.optional(),

      limit: positiveIntegerQuerySchema
        .refine((value) => value <= 100, {
          message: 'Limit cannot exceed 100.',
        })
        .optional(),

      search: z
        .string()
        .trim()
        .max(200)
        .optional(),

      status: assessmentResultStatusSchema.optional(),
    })
    .strict(),

  body: emptyObjectSchema,
});

const facultyOnly = authorize(USER_ROLES.FACULTY);

// Existing academic assessment listing endpoint.
facultyAssessmentResultsRouter.get(
  '/faculty',
  authenticate,
  facultyOnly,
  validate(listFacultyAcademicResultsSchema),
  listFacultyAcademicResultsController,
);

// Student-wise assessment result details endpoint.
facultyAssessmentResultsRouter.get(
  '/faculty/:assessmentId/results',
  authenticate,
  facultyOnly,
  validate(listFacultyAssessmentResultDetailsSchema),
  listFacultyAssessmentResultDetailsController,
);

export default facultyAssessmentResultsRouter;