import { Router } from 'express';
import { z } from 'zod';

import {
  createFacultyController,
  listFacultyController,
  getFacultyByIdController,
  updateFacultyController,
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

const emptyObjectSchema = z.object({}).strict();

const createFacultySchema = z.object({
  body: z.object({
    institutionalId: z.string().trim().min(2).max(50),
    fullName: z.string().trim().min(2).max(100),
    email: z.string().trim().email().max(254),
    password: z.string().min(8).max(72),
  }).strict(),

  params: emptyObjectSchema,
  query: emptyObjectSchema,
});

const listFacultySchema = z.object({
  body: emptyObjectSchema,
  params: emptyObjectSchema,

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

const facultyIdParamsSchema = z.object({
  facultyId: z.string().regex(
    /^[a-f\d]{24}$/i,
    'A valid faculty account ID is required.',
  ),
});

const getFacultyByIdSchema = z.object({
  body: emptyObjectSchema,
  params: facultyIdParamsSchema,
  query: emptyObjectSchema,
});

const updateFacultySchema = z.object({
  body: z.object({
    institutionalId: z.string().trim().min(2).max(50).optional(),
    fullName: z.string().trim().min(2).max(100).optional(),
    email: z.string().trim().email().max(254).optional(),
  })
    .strict()
    .refine(
      (body) => Object.keys(body).length > 0,
      {
        message: 'Provide at least one field to update.',
      },
    ),

  params: facultyIdParamsSchema,
  query: emptyObjectSchema,
});

// List faculty and mentor accounts within the authenticated HOD's
// department.
//
// GET /api/v1/provisioning/faculty
facultyRouter.get(
  '/',
  authenticate,
  authorize('HOD'),
  validate(listFacultySchema),
  listFacultyController,
);

// Create a faculty account within the authenticated HOD's department.
//
// POST /api/v1/provisioning/faculty
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

// Retrieve an individual faculty or mentor account.
//
// GET /api/v1/provisioning/faculty/:facultyId
facultyRouter.get(
  '/:facultyId',
  authenticate,
  authorize('HOD'),
  validate(getFacultyByIdSchema),
  getFacultyByIdController,
);

// Update permitted fields on an individual faculty or mentor account.
//
// PATCH /api/v1/provisioning/faculty/:facultyId
facultyRouter.patch(
  '/:facultyId',
  authenticate,
  authorize('HOD'),
  authRateLimiter,
  validate(updateFacultySchema),
  auditEvent({
    action: 'FACULTY_ACCOUNT_UPDATE',
    resourceType: 'FacultyAccount',
    getResourceId: (req) => req.params.facultyId,
    getMetadata: (req) => ({
      updatedFields: Object.keys(req.body ?? {}),
    }),
  }),
  updateFacultyController,
);

export default facultyRouter;