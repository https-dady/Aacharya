import { Router } from 'express';
import { z } from 'zod';

import {
  createFacultyController,
  listFacultyController,
} from '../controllers/faculty.controller.js';

import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { authRateLimiter } from '../middleware/rate-limit.middleware.js';
import { auditEvent } from '../middleware/audit.middleware.js';

import {
  USER_ROLES,
  ACCOUNT_STATUSES,
} from '../models/user.model.js';

const facultyRouter = Router();

const createFacultySchema = z.object({
  body: z.object({
    institutionalId: z.string().trim().min(2).max(50),
    fullName: z.string().trim().min(2).max(100),
    email: z.string().trim().email().max(254),
    password: z.string().min(8).max(72),
  }).strict(),

  params: z.object({}),
  query: z.object({}),
});

const listFacultySchema = z.object({
  body: z.object({}),

  params: z.object({}),

  query: z.object({
    page: z.coerce.number().int().min(1).max(100000).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),

    search: z.string().trim().max(100).optional(),

    role: z.enum([
      USER_ROLES.FACULTY,
      USER_ROLES.MENTOR,
    ]).optional(),

    status: z.enum([
      ACCOUNT_STATUSES.ACTIVE,
      ACCOUNT_STATUSES.SUSPENDED,
      ACCOUNT_STATUSES.DISABLED,
    ]).optional(),
  }).strict(),
});

// Read-only faculty listing.
// Authentication, HOD authorization, and query validation remain enforced.
// The global API rate limiter still applies.
facultyRouter.get(
  '/',
  authenticate,
  authorize('HOD'),
  validate(listFacultySchema),
  listFacultyController,
);

// Creating a faculty account is a state-changing operation.
// Keep the stricter rate limiter and audit event.
facultyRouter.post(
  '/',
  authenticate,
  authorize('HOD'),
  authRateLimiter,
  validate(createFacultySchema),
  auditEvent({
    action: 'FACULTY_ACCOUNT_CREATE',
    resourceType: 'FacultyAccount',
    getMetadata: () => ({
      targetRole: USER_ROLES.FACULTY,
    }),
  }),
  createFacultyController,
);

export default facultyRouter;