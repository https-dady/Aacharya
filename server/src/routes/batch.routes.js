import { Router } from 'express';
import { z } from 'zod';

import {
  createBatchController,
  listBatchesController,
} from '../controllers/batch.controller.js';

import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { authRateLimiter } from '../middleware/rate-limit.middleware.js';

import { BATCH_STATUSES } from '../models/batch.model.js';

const batchRouter = Router();

const academicYearSchema = z
  .string()
  .regex(
    /^\d{4}-\d{4}$/,
    'Academic year must use the YYYY-YYYY format.',
  )
  .refine((value) => {
    const [start, end] = value.split('-').map(Number);

    return end === start + 1;
  }, 'Academic year must contain consecutive years.');

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

    academicYear: academicYearSchema,
  }).strict(),

  params: z.object({}),
  query: z.object({}),
});

const listBatchesSchema = z.object({
  body: z.object({}),

  params: z.object({}),

  query: z.object({
    page: z.coerce
      .number()
      .int()
      .min(1)
      .max(100000)
      .optional(),

    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .optional(),

    search: z.string().trim().max(100).optional(),

    status: z
      .enum([
        BATCH_STATUSES.ACTIVE,
        BATCH_STATUSES.INACTIVE,
      ])
      .optional(),

    academicYear: academicYearSchema.optional(),
  }).strict(),
});

batchRouter.get(
  '/',
  authenticate,
  authorize('HOD'),
  authRateLimiter,
  validate(listBatchesSchema),
  listBatchesController,
);

batchRouter.post(
  '/',
  authenticate,
  authorize('HOD'),
  authRateLimiter,
  validate(createBatchSchema),
  createBatchController,
);

export default batchRouter;