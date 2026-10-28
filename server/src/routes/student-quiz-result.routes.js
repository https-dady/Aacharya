import { Router } from 'express';

import {
  listMyQuizResultsController,
} from '../controllers/student-quiz-result.controller.js';

import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { USER_ROLES } from '../models/user.model.js';
import { authRateLimiter } from '../middleware/rate-limit.middleware.js';

const studentQuizResultRouter = Router();

studentQuizResultRouter.get(
  '/me',
  authenticate,
  authorize(USER_ROLES.STUDENT),
  authRateLimiter,
  listMyQuizResultsController,
);

export default studentQuizResultRouter;