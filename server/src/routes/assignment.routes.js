import { Router } from 'express';
import { z } from 'zod';

import {
  createDepartmentContentController,
  listDepartmentContentController,
} from '../controllers/assignment.controller.js';

import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { authRateLimiter } from '../middleware/rate-limit.middleware.js';
import { auditEvent } from '../middleware/audit.middleware.js';

import {
  ASSIGNMENT_CONTENT_TYPES,
  ASSIGNMENT_STATUSES,
} from '../models/assignment.model.js';

const assignmentRouter = Router();

const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'A valid MongoDB ID is required.');

const contentTypeSchema = z.enum(
  Object.values(ASSIGNMENT_CONTENT_TYPES),
);

const assignmentStatusSchema = z.enum(
  Object.values(ASSIGNMENT_STATUSES),
);

const emptyObjectSchema = z.object({}).strict();

const listContentSchema = z.object({
  params: emptyObjectSchema,
  body: emptyObjectSchema,
  query: z.object({
    page: z.coerce.number().int().min(1).max(100000).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    search: z.string().trim().max(100).optional(),
    contentType: contentTypeSchema.optional(),
    status: assignmentStatusSchema.optional(),
    courseId: objectIdSchema.optional(),
  }).strict(),
});

const createContentSchema = z.object({
  params: emptyObjectSchema,
  query: emptyObjectSchema,
  body: z.object({
    title: z.string().trim().min(2).max(200),

    contentType: contentTypeSchema.optional(),

    description: z.string().trim().min(1).max(10000),

    courseId: objectIdSchema,

    batchIds: z.array(objectIdSchema).max(100).optional(),

    sectionIds: z.array(objectIdSchema).max(500).optional(),

    dueDate: z.string().datetime({
      offset: true,
    }),

    totalMarks: z.coerce.number().min(1).max(10000),

    attachments: z.array(
      z.object({
        name: z.string().trim().min(1).max(255),
        url: z.string().trim().url().max(2048),
        mimeType: z.string().trim().max(150).optional(),
        size: z.coerce.number().min(0).optional(),
      }).strict(),
    ).max(10).optional(),

    status: assignmentStatusSchema.optional(),
  }).strict(),
});

const contentManagerRoles = [
  'HOD',
  'FACULTY',
  'MENTOR',
];

assignmentRouter.get(
  '/manage',
  authenticate,
  authorize(...contentManagerRoles),
  authRateLimiter,
  validate(listContentSchema),
  listDepartmentContentController,
);

assignmentRouter.post(
  '/manage',
  authenticate,
  authorize(...contentManagerRoles),
  authRateLimiter,
  validate(createContentSchema),
  auditEvent({
    action: 'ASSIGNMENT_PRACTICAL_CREATE',
    resourceType: 'Assignment',
    getMetadata: (req) => ({
      contentType: req.body.contentType || 'ASSIGNMENT',
      courseId: req.body.courseId,
      status: req.body.status || 'DRAFT',
      batchCount: req.body.batchIds?.length || 0,
      sectionCount: req.body.sectionIds?.length || 0,
      attachmentCount: req.body.attachments?.length || 0,
    }),
  }),
  createDepartmentContentController,
);

export default assignmentRouter;