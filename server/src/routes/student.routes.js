import { Router } from 'express';
import { z } from 'zod';

import {
  createStudentController,
  listStudentsController,
  getStudentDetailsController,
  updateStudentController,
  updateStudentStatusController,
} from '../controllers/student.controller.js';

import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { authRateLimiter } from '../middleware/rate-limit.middleware.js';

const studentRouter = Router();

const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i);

const studentParamsSchema = z.object({
  sectionId: objectIdSchema,
}).strict();

const studentDetailsParamsSchema = z.object({
  sectionId: objectIdSchema,
  studentId: objectIdSchema,
}).strict();

const createStudentSchema = z.object({
  params: studentParamsSchema,

  body: z.object({
    institutionalId: z.string().trim().min(2).max(50),
    fullName: z.string().trim().min(2).max(100),
    email: z.string().trim().email().max(254).optional(),
    password: z.string().min(8).max(72),
  }).strict(),
});

const listStudentsSchema = z.object({
  params: studentParamsSchema,

  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().max(100).optional(),
    status: z.enum([
      'ACTIVE',
      'SUSPENDED',
      'DISABLED',
    ]).optional(),
  }).strict(),
});

const studentDetailsSchema = z.object({
  params: studentDetailsParamsSchema,
});

const updateStudentSchema = z.object({
  params: studentDetailsParamsSchema,

  body: z.object({
    fullName: z.string().trim().min(2).max(100).optional(),
    email: z.union([
      z.string().trim().email().max(254),
      z.literal(''),
    ]).optional(),
  }).strict().refine(
    (body) =>
      body.fullName !== undefined ||
      body.email !== undefined,
    {
      message: 'Provide at least one profile field to update.',
    },
  ),
});

const updateStudentStatusSchema = z.object({
  params: studentDetailsParamsSchema,

  body: z.object({
    status: z.enum([
      'ACTIVE',
      'SUSPENDED',
      'DISABLED',
    ]),
  }).strict(),
});

/*
 * Create one student.
 * POST /api/v1/provisioning/sections/:sectionId/students
 */
studentRouter.post(
  '/sections/:sectionId/students',
  authenticate,
  authRateLimiter,
  validate(createStudentSchema),
  createStudentController,
);

/*
 * List students with pagination and search.
 * GET /api/v1/provisioning/sections/:sectionId/students
 */
studentRouter.get(
  '/sections/:sectionId/students',
  authenticate,
  authRateLimiter,
  validate(listStudentsSchema),
  listStudentsController,
);

/*
 * Get an individual student's details.
 * GET /api/v1/provisioning/sections/:sectionId/students/:studentId
 */
studentRouter.get(
  '/sections/:sectionId/students/:studentId',
  authenticate,
  authRateLimiter,
  validate(studentDetailsSchema),
  getStudentDetailsController,
);

/*
 * Update a student's permitted profile fields.
 * PATCH /api/v1/provisioning/sections/:sectionId/students/:studentId
 */
studentRouter.patch(
  '/sections/:sectionId/students/:studentId',
  authenticate,
  authRateLimiter,
  validate(updateStudentSchema),
  updateStudentController,
);

/*
 * Update a student's account status.
 * PATCH /api/v1/provisioning/sections/:sectionId/students/:studentId/status
 */
studentRouter.patch(
  '/sections/:sectionId/students/:studentId/status',
  authenticate,
  authRateLimiter,
  validate(updateStudentStatusSchema),
  updateStudentStatusController,
);

export default studentRouter;