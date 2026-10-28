import { Router } from 'express';

import {
  listMyQuizzesController,
} from '../controllers/student-quiz.controller.js';

import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { USER_ROLES } from '../models/user.model.js';

const studentQuizRouter = Router();

studentQuizRouter.get(
  '/me',
  authenticate,
  authorize(USER_ROLES.STUDENT),
  listMyQuizzesController,
);

export default studentQuizRouter;