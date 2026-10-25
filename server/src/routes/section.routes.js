import { Router } from 'express';
import { z } from 'zod';

import {
  createSectionController,
  listSectionsController,
} from '../controllers/section.controller.js';

import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { authRateLimiter } from '../middleware/rate-limit.middleware.js';

import { SECTION_STATUSES } from '../models/section.model.js';

const sectionRouter = Router();

const batchIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'A valid batch ID is required.');

const createSectionSchema = z.object({
  params: z.object({
    batchId: batchIdSchema,
  }).strict(),

  body: z.object({
    name: z.string().trim().min(1).max(50),

    code: z
      .string()
      .trim()
      .min(1)
      .max(20)
      .regex(
        /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/,
        'Section code can contain letters, numbers, and hyphens.',
      ),
  }).strict(),

  query: z.object({}),
});

const listSectionsSchema = z.object({
  params: z.object({
    batchId: batchIdSchema,
  }).strict(),

  body: z.object({}),

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
        SECTION_STATUSES.ACTIVE,
        SECTION_STATUSES.INACTIVE,
      ])
      .optional(),
  }).strict(),
});

sectionRouter.get(
  '/batches/:batchId/sections',
  authenticate,
  authorize('HOD'),
  authRateLimiter,
  validate(listSectionsSchema),
  listSectionsController,
);

sectionRouter.post(
  '/batches/:batchId/sections',
  authenticate,
  authorize('HOD'),
  authRateLimiter,
  validate(createSectionSchema),
  createSectionController,
);

export default sectionRouter;