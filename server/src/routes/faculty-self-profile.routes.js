import { Router } from 'express';
import { z } from 'zod';

import {
  getFacultySelfProfileController,
  updateFacultySelfProfileController,
} from '../controllers/faculty-self-profile.controller.js';

import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { authRateLimiter } from '../middleware/rate-limit.middleware.js';
import { auditEvent } from '../middleware/audit.middleware.js';

const facultySelfProfileRouter = Router();

const emptyObjectSchema = z.object({}).strict();

const updateFacultyProfileSchema = z.object({
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

  params: emptyObjectSchema,
  query: emptyObjectSchema,
});

// Retrieve the authenticated faculty member's own profile.
facultySelfProfileRouter.get(
  '/me',
  authenticate,
  authorize('FACULTY'),
  getFacultySelfProfileController,
);

// Update permitted fields on the authenticated faculty profile.
facultySelfProfileRouter.patch(
  '/me',
  authenticate,
  authorize('FACULTY'),
  authRateLimiter,
  validate(updateFacultyProfileSchema),
  auditEvent({
    action: 'FACULTY_SELF_PROFILE_UPDATE',
    resourceType: 'FacultyProfile',
    getResourceId: (req) => req.user?.id,
    getMetadata: (req) => ({
      updatedFields: Object.keys(req.body ?? {}),
    }),
  }),
  updateFacultySelfProfileController,
);

export default facultySelfProfileRouter;