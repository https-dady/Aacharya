import { Router } from 'express';
import { z } from 'zod';

import { createDepartmentController } from '../controllers/department.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { authRateLimiter } from '../middleware/rate-limit.middleware.js';

const departmentRouter = Router();

const createDepartmentSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(120),
    code: z
      .string()
      .trim()
      .min(2)
      .max(20)
      .regex(
        /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/,
        'Department code can contain letters, numbers, and hyphens.',
      ),
    description: z.string().trim().max(500).optional().default(''),
  }).strict(),
});

departmentRouter.post(
  '/',
  authenticate,
  authorize('SUPER_ADMIN'),
  authRateLimiter,
  validate(createDepartmentSchema),
  createDepartmentController,
);

export default departmentRouter;