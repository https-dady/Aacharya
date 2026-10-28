import { Router } from 'express';

import {
  getStudentSelfProfileController,
} from '../controllers/student-self-profile.controller.js';

import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { authRateLimiter } from '../middleware/rate-limit.middleware.js';

const studentProfileRouter = Router();

/*
 * Get the currently authenticated student's own profile.
 * GET /api/v1/students/me
 */
studentProfileRouter.get(
  '/me',
  authenticate,
  authorize('STUDENT'),
  authRateLimiter,
  getStudentSelfProfileController,
);

export default studentProfileRouter;