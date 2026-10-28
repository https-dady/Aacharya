import { Router } from 'express';
import { z } from 'zod';

import {
  createDepartmentController,
  listDepartmentsController,
  getDepartmentDetailsController,
  manageDepartmentHodAssignmentController,
} from '../controllers/department.controller.js';

import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { authRateLimiter } from '../middleware/rate-limit.middleware.js';
import { auditEvent } from '../middleware/audit.middleware.js';

const departmentRouter = Router();

const objectIdSchema = /^[a-f\d]{24}$/i;

const createDepartmentSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(120),

    code: z
      .string()
      .trim()
      .min(2)
      .max(20)
      .regex(
        /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/,
        'Department code can contain letters, numbers, and hyphens.',
      ),

    description: z.string().trim().max(500).optional().default(''),
  }).strict(),
});

const departmentDetailsSchema = z.object({
  params: z.object({
    departmentId: z.string().regex(
      objectIdSchema,
      'A valid department ID is required.',
    ),
  }).strict(),
});

const departmentHodAssignmentSchema = z.object({
  params: z.object({
    departmentId: z.string().regex(
      objectIdSchema,
      'A valid department ID is required.',
    ),
  }).strict(),

  body: z.object({
    hodId: z.union([
      z.string().regex(
        objectIdSchema,
        'A valid HOD account ID is required.',
      ),
      z.null(),
    ]),
  }).strict(),
});

// All department management routes require an authenticated Super Admin.
departmentRouter.use(
  authenticate,
  authorize('SUPER_ADMIN'),
);

// List departments.
// Read-only requests use the global API rate limiter.
departmentRouter.get(
  '/',
  listDepartmentsController,
);

// Retrieve one department and its current HOD assignment.
departmentRouter.get(
  '/:departmentId',
  validate(departmentDetailsSchema),
  getDepartmentDetailsController,
);

// Assign, replace, transfer, or remove a department's HOD.
// Keep the stricter limiter on this state-changing operation.
departmentRouter.patch(
  '/:departmentId/hod',
  authRateLimiter,
  validate(departmentHodAssignmentSchema),
  auditEvent({
    action: 'DEPARTMENT_HOD_ASSIGNMENT_UPDATE',
    resourceType: 'Department',
    getResourceId: (req) => req.params.departmentId,
    getMetadata: (req) => ({
      departmentId: req.params.departmentId,
      requestedHodId: req.body.hodId,
    }),
  }),
  manageDepartmentHodAssignmentController,
);

// Create a department.
// Keep the stricter limiter on this state-changing operation.
departmentRouter.post(
  '/',
  authRateLimiter,
  validate(createDepartmentSchema),
  auditEvent({
    action: 'DEPARTMENT_CREATE',
    resourceType: 'Department',
    getMetadata: (req) => ({
      departmentCode: req.body.code.trim().toUpperCase(),
    }),
  }),
  createDepartmentController,
);

export default departmentRouter;