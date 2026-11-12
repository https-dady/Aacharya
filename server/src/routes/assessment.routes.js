import { Router } from 'express';

import {
  listHodAssessmentsController,
  createHodAssessmentController,
  updateHodAssessmentController,
  listHodAssessmentResultsController,
  updateHodAssessmentResultsController,
} from '../controllers/hod-assessment.controller.js';

import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { authRateLimiter } from '../middleware/rate-limit.middleware.js';
import { auditEvent } from '../middleware/audit.middleware.js';

import {
  USER_ROLES,
} from '../models/user.model.js';

import {
  listAssessmentsSchema,
  createAssessmentSchema,
  updateAssessmentSchema,
  listAssessmentResultsSchema,
  updateAssessmentResultsSchema,
} from '../validation/assessment.validation.js';

const assessmentRouter = Router();

const hodOnly = authorize(USER_ROLES.HOD);

/**
 * GET /api/v1/assessments/manage
 *
 * Lists assessments belonging to the authenticated HOD's department.
 */
assessmentRouter.get(
  '/manage',
  authenticate,
  hodOnly,
  validate(listAssessmentsSchema),
  listHodAssessmentsController,
);

/**
 * POST /api/v1/assessments/manage
 *
 * Creates an assessment and initializes student result records.
 */
assessmentRouter.post(
  '/manage',
  authenticate,
  hodOnly,
  authRateLimiter,
  validate(createAssessmentSchema),

  auditEvent({
    action: 'ASSESSMENT_CREATE',
    resourceType: 'Assessment',

    getMetadata: (req) => ({
      type: req.body.type,
      courseId: req.body.courseId,
      batchCount: req.body.batchIds?.length || 0,
      sectionCount: req.body.sectionIds?.length || 0,
      totalMarks: req.body.totalMarks,
    }),
  }),

  createHodAssessmentController,
);

/**
 * PATCH /api/v1/assessments/manage/:assessmentId
 *
 * Updates assessment details and lifecycle status.
 */
assessmentRouter.patch(
  '/manage/:assessmentId',
  authenticate,
  hodOnly,
  authRateLimiter,
  validate(updateAssessmentSchema),

  auditEvent({
    action: 'ASSESSMENT_UPDATE',
    resourceType: 'Assessment',

    getResourceId: (req) => req.params.assessmentId,

    getMetadata: (req) => ({
      updatedFields: Object.keys(req.body),
    }),
  }),

  updateHodAssessmentController,
);

/**
 * GET /api/v1/assessments/manage/:assessmentId/results
 *
 * Lists student-wise results for an assessment.
 */
assessmentRouter.get(
  '/manage/:assessmentId/results',
  authenticate,
  hodOnly,
  validate(listAssessmentResultsSchema),
  listHodAssessmentResultsController,
);

/**
 * PATCH /api/v1/assessments/manage/:assessmentId/results
 *
 * Saves student-wise marks in bulk.
 */
assessmentRouter.patch(
  '/manage/:assessmentId/results',
  authenticate,
  hodOnly,
  authRateLimiter,
  validate(updateAssessmentResultsSchema),

  auditEvent({
    action: 'ASSESSMENT_RESULTS_UPDATE',
    resourceType: 'Assessment',

    getResourceId: (req) => req.params.assessmentId,

    getMetadata: (req) => ({
      resultCount: req.body.results?.length || 0,
    }),
  }),

  updateHodAssessmentResultsController,
);

export default assessmentRouter;