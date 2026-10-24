import { Router } from 'express';
import { z } from 'zod';

import { assignMentorController } from '../controllers/mentor.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { authRateLimiter } from '../middleware/rate-limit.middleware.js';

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
});

mentorRouter.patch(
  '/faculty/:facultyId/mentor',
  authenticate,
  authRateLimiter,
  validate(assignMentorSchema),
  assignMentorController,
);

export default mentorRouter;