import { Router } from 'express';
import { z } from 'zod';

import {
  getHodSelfProfileController,
  updateHodSelfProfileController,
} from '../controllers/hod-self-profile.controller.js';

import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { authRateLimiter } from '../middleware/rate-limit.middleware.js';
import { auditEvent } from '../middleware/audit.middleware.js';

const hodSelfProfileRouter = Router();

const updateHodProfileSchema = z.object({
  body: z.object({
    fullName: z.string().trim().min(2).max(100).optional(),
    email: z.string().trim().email().max(254).optional(),
  })
    .strict()
    .refine(
      (body) => Object.keys(body).length > 0,
      {
        message: 'Provide at least one profile field to update.',
      },
    ),
});

// Retrieve the authenticated HOD's own profile.
hodSelfProfileRouter.get(
  '/me',
  authenticate,
  getHodSelfProfileController,
);

// Update permitted fields on the authenticated HOD's profile.
hodSelfProfileRouter.patch(
  '/me',
  authenticate,
  authRateLimiter,
  validate(updateHodProfileSchema),
  auditEvent({
    action: 'HOD_SELF_PROFILE_UPDATE',
    resourceType: 'HODProfile',
    getResourceId: (req) => req.user?.id,
    getMetadata: (req) => ({
      updatedFields: Object.keys(req.body ?? {}),
    }),
  }),
  updateHodSelfProfileController,
);

export default hodSelfProfileRouter;