import { Router } from 'express';
import { z } from 'zod';

import {
  createHodController,
  getHodDetailsController,
  listHodsController,
} from '../controllers/hod.controller.js';

import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { authRateLimiter } from '../middleware/rate-limit.middleware.js';
import { auditEvent } from '../middleware/audit.middleware.js';

const hodRouter = Router();

const createHodSchema = z.object({
  params: z.object({
    departmentId: z.string().regex(
      /^[a-f\d]{24}$/i,
      'A valid department ID is required.',
    ),
  }).strict(),

  body: z.object({
    institutionalId: z.string().trim().min(2).max(50),
    fullName: z.string().trim().min(2).max(100),
    email: z.string().trim().email().max(254),
    password: z.string().min(8).max(72),
  }).strict(),
});

const hodDetailsSchema = z.object({
  params: z.object({
    hodId: z.string().regex(
      /^[a-f\d]{24}$/i,
      'A valid HOD account ID is required.',
    ),
  }).strict(),
});

// List HOD accounts for the Super Admin directory.
hodRouter.get(
  '/hods',
  authenticate,
  authorize('SUPER_ADMIN'),
  authRateLimiter,
  listHodsController,
);

// Retrieve details for one HOD account.
hodRouter.get(
  '/hods/:hodId',
  authenticate,
  authorize('SUPER_ADMIN'),
  authRateLimiter,
  validate(hodDetailsSchema),
  getHodDetailsController,
);

// Create an HOD account and assign it to a department.
hodRouter.post(
  '/departments/:departmentId/hod',
  authenticate,
  authorize('SUPER_ADMIN'),
  authRateLimiter,
  validate(createHodSchema),
  auditEvent({
    action: 'HOD_ACCOUNT_CREATE',
    resourceType: 'DepartmentHOD',
    getMetadata: (req) => ({
      departmentId: req.params.departmentId,
    }),
  }),
  createHodController,
);

export default hodRouter;