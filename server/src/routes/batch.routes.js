import { Router } from 'express';
import { z } from 'zod';

import { createBatchController } from '../controllers/batch.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { authRateLimiter } from '../middleware/rate-limit.middleware.js';

const batchRouter = Router();

const createBatchSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(100),

    code: z
      .string()
      .trim()
      .min(2)
      .max(30)
      .regex(
        /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/,
        'Batch code can contain letters, numbers, and hyphens.',
      ),

    academicYear: z
      .string()
      .regex(
        /^\d{4}-\d{4}$/,
        'Academic year must use the YYYY-YYYY format.',
      )
      .refine((value) => {
        const [start, end] = value.split('-').map(Number);
        return end === start + 1;
      }, 'Academic year must contain consecutive years.'),
  }).strict(),
});

batchRouter.post(
  '/',
  authenticate,
  authRateLimiter,
  validate(createBatchSchema),
  createBatchController,
);

export default batchRouter;