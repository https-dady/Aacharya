import { Router } from 'express';
import { z } from 'zod';

import { createHodController } from '../controllers/hod.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { authRateLimiter } from '../middleware/rate-limit.middleware.js';

const hodRouter = Router();

const createHodSchema = z.object({
  params: z.object({
    departmentId: z.string().regex(
      /^[a-f\d]{24}$/i,
      'A valid department ID is required.',
    ),
  }).strict(),

  body: z.object({
    institutionalId: z.string().trim().min(2).max(50),
    fullName: z.string().trim().min(2).max(100),
    email: z.string().trim().email().max(254),
    password: z.string().min(8).max(72),
  }).strict(),
});

hodRouter.post(
  '/departments/:departmentId/hod',
  authenticate,
  authorize('SUPER_ADMIN'),
  authRateLimiter,
  validate(createHodSchema),
  createHodController,
);

export default hodRouter;