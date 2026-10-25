import { Router } from 'express';
import { z } from 'zod';

import {
  assignMentorController,
  listMentorsController,
} from '../controllers/mentor.controller.js';

import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { authRateLimiter } from '../middleware/rate-limit.middleware.js';

import {
  ACCOUNT_STATUSES,
} from '../models/user.model.js';

const mentorRouter = Router();

const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'A valid MongoDB ID is required.');

const assignMentorSchema = z.object({
  params: z.object({
    facultyId: objectIdSchema,
  }).strict(),

  body: z.object({
    batchIds: z.array(objectIdSchema).max(100),
    sectionIds: z.array(objectIdSchema).max(500),
  }).strict(),

  query: z.object({}),
});

const listMentorsSchema = z.object({
  params: z.object({}),

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
        ACCOUNT_STATUSES.ACTIVE,
        ACCOUNT_STATUSES.SUSPENDED,
        ACCOUNT_STATUSES.DISABLED,
      ])
      .optional(),
  }).strict(),
});

mentorRouter.get(
  '/mentors',
  authenticate,
  authorize('HOD'),
  authRateLimiter,
  validate(listMentorsSchema),
  listMentorsController,
);

mentorRouter.patch(
  '/faculty/:facultyId/mentor',
  authenticate,
  authorize('HOD'),
  authRateLimiter,
  validate(assignMentorSchema),
  assignMentorController,
);

export default mentorRouter;