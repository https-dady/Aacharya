import { Router } from 'express';

import {
  listMyAttendanceController,
} from '../controllers/student-attendance.controller.js';

import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { USER_ROLES } from '../models/user.model.js';
import { authRateLimiter } from '../middleware/rate-limit.middleware.js';

const studentAttendanceRouter = Router();

studentAttendanceRouter.get(
  '/me',
  authenticate,
  authorize(USER_ROLES.STUDENT),
  authRateLimiter,
  listMyAttendanceController,
);

export default studentAttendanceRouter;