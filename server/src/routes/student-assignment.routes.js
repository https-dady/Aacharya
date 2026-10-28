import { Router } from 'express';

import {
  listMyAssignmentsController,
} from '../controllers/student-assignment.controller.js';

import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { authRateLimiter } from '../middleware/rate-limit.middleware.js';

const studentAssignmentRouter = Router();

studentAssignmentRouter.get(
  '/me',
  authenticate,
  authorize('STUDENT'),
  authRateLimiter,
  listMyAssignmentsController,
);

export default studentAssignmentRouter;