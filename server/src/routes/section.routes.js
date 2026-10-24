import { Router } from 'express';
import { z } from 'zod';

import {
  createSectionController,
} from '../controllers/section.controller.js';

import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { authRateLimiter } from '../middleware/rate-limit.middleware.js';

const sectionRouter = Router();

const createSectionSchema = z.object({
  params: z.object({
    batchId: z.string().regex(
      /^[a-f\d]{24}$/i,
      'A valid batch ID is required.',
    ),
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
});

sectionRouter.post(
  '/batches/:batchId/sections',
  authenticate,
  authRateLimiter,
  validate(createSectionSchema),
  createSectionController,
);

export default sectionRouter;