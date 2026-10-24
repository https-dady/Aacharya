import { Router } from 'express';
import { z } from 'zod';

import { createFacultyController } from '../controllers/faculty.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { authRateLimiter } from '../middleware/rate-limit.middleware.js';

const facultyRouter = Router();

const createFacultySchema = z.object({
  body: z.object({
    institutionalId: z.string().trim().min(2).max(50),
    fullName: z.string().trim().min(2).max(100),
    email: z.string().trim().email().max(254),
    password: z.string().min(8).max(72),
  }).strict(),
});

facultyRouter.post(
  '/',
  authenticate,
  authRateLimiter,
  validate(createFacultySchema),
  createFacultyController,
);

export default facultyRouter;