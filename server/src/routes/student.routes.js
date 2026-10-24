import { Router } from 'express';
import { z } from 'zod';

import {
  createStudentController,
} from '../controllers/student.controller.js';

import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { authRateLimiter } from '../middleware/rate-limit.middleware.js';

const studentRouter = Router();

const createStudentSchema = z.object({
  params: z.object({
    sectionId: z.string().regex(
      /^[a-f\d]{24}$/i,
      'A valid section ID is required.',
    ),
  }).strict(),

  body: z.object({
    institutionalId: z.string().trim().min(2).max(50),
    fullName: z.string().trim().min(2).max(100),
    email: z.string().trim().email().max(254).optional(),
    password: z.string().min(8).max(72),
  }).strict(),
});

studentRouter.post(
  '/sections/:sectionId/students',
  authenticate,
  authRateLimiter,
  validate(createStudentSchema),
  createStudentController,
);

export default studentRouter;