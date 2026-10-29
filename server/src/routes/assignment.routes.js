import { Router } from 'express';
import { z } from 'zod';

import {
  createDepartmentContentController,
  listDepartmentContentController,
  updateDepartmentContentController,
} from '../controllers/assignment.controller.js';

import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { authRateLimiter } from '../middleware/rate-limit.middleware.js';
import { auditEvent } from '../middleware/audit.middleware.js';

import {
  assignmentUpload,
} from '../middleware/assignment-upload.middleware.js';

import {
  ASSIGNMENT_CONTENT_TYPES,
  ASSIGNMENT_STATUSES,
} from '../models/assignment.model.js';

const assignmentRouter = Router();

const contentManagerRoles = [
  'HOD',
  'FACULTY',
  'MENTOR',
];

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

const attachmentSchema = z.object({
  name: z.string().trim().min(1).max(255),
  url: z.string().trim().url().max(2048),
  mimeType: z.string().trim().max(150).optional(),
  size: z.coerce.number().min(0).optional(),
  publicId: z.string().trim().max(500).optional(),
  resourceType: z.enum(['image', 'raw', 'video']).optional(),
}).strict();

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

    attachments: z.array(attachmentSchema).max(10).optional(),

    status: assignmentStatusSchema.optional(),
  }).strict(),
});

const updateContentSchema = z.object({
  params: z.object({
    assignmentId: objectIdSchema,
  }).strict(),

  query: emptyObjectSchema,

  body: z.object({
    title: z.string().trim().min(2).max(200).optional(),

    contentType: contentTypeSchema.optional(),

    description: z.string().trim().min(1).max(10000).optional(),

    courseId: objectIdSchema.optional(),

    batchIds: z.array(objectIdSchema).max(100).optional(),

    sectionIds: z.array(objectIdSchema).max(500).optional(),

    dueDate: z.string().datetime({
      offset: true,
    }).optional(),

    totalMarks: z.coerce.number().min(1).max(10000).optional(),

    attachments: z.array(attachmentSchema).max(10).optional(),

    status: assignmentStatusSchema.optional(),
  }).strict(),
});

/**
 * Parse JSON-encoded array fields sent through FormData.
 *
 * The frontend sends arrays as JSON strings because FormData
 * cannot directly transport JavaScript arrays or objects.
 *
 * This middleware does not modify uploaded files in req.files.
 */
function parseMultipartArrays(req, res, next) {
  try {
    if (!req.is('multipart/form-data')) {
      return next();
    }

    const arrayFields = [
      'batchIds',
      'sectionIds',
      'attachments',
    ];

    for (const field of arrayFields) {
      if (req.body[field] === undefined) {
        continue;
      }

      const value = req.body[field];

      if (Array.isArray(value)) {
        continue;
      }

      if (typeof value !== 'string') {
        const error = new Error(
          `The ${field} field must contain a JSON array.`,
        );

        error.statusCode = 400;
        error.code = 'INVALID_MULTIPART_ARRAY';
        error.expose = true;

        return next(error);
      }

      let parsedValue;

      try {
        parsedValue = JSON.parse(value);
      } catch {
        const error = new Error(
          `The ${field} field must contain valid JSON.`,
        );

        error.statusCode = 400;
        error.code = 'INVALID_MULTIPART_JSON';
        error.expose = true;

        return next(error);
      }

      if (!Array.isArray(parsedValue)) {
        const error = new Error(
          `The ${field} field must contain a JSON array.`,
        );

        error.statusCode = 400;
        error.code = 'INVALID_MULTIPART_ARRAY';
        error.expose = true;

        return next(error);
      }

      req.body[field] = parsedValue;
    }

    return next();
  } catch (error) {
    return next(error);
  }
}

/**
 * Translate Multer upload errors into API-friendly errors.
 */
function handleAssignmentUpload(req, res, next) {
  assignmentUpload(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error.code === 'LIMIT_FILE_SIZE') {
      error.statusCode = 413;
      error.code = 'ATTACHMENT_TOO_LARGE';
      error.message = 'Each attachment must be 10 MB or smaller.';
      error.expose = true;

      return next(error);
    }

    if (error.code === 'LIMIT_FILE_COUNT') {
      error.statusCode = 400;
      error.code = 'TOO_MANY_ATTACHMENTS';
      error.message = 'You can upload at most 5 files per request.';
      error.expose = true;

      return next(error);
    }

    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      error.statusCode = 400;
      error.code = 'UNEXPECTED_ATTACHMENT_FIELD';
      error.message = 'Files must be uploaded using the attachments field.';
      error.expose = true;

      return next(error);
    }

    return next(error);
  });
}

/**
 * GET /api/v1/assignments/manage
 *
 * List assignments and practicals visible to the authenticated user.
 */
assignmentRouter.get(
  '/manage',
  authenticate,
  authorize(...contentManagerRoles),
  authRateLimiter,
  validate(listContentSchema),
  listDepartmentContentController,
);

/**
 * POST /api/v1/assignments/manage
 *
 * Create an assignment or practical.
 *
 * Supports:
 * - JSON requests containing attachment URLs.
 * - multipart/form-data requests containing attachment URLs and files.
 */
assignmentRouter.post(
  '/manage',
  authenticate,
  authorize(...contentManagerRoles),
  authRateLimiter,
  handleAssignmentUpload,
  parseMultipartArrays,
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
      attachmentCount:
        (req.body.attachments?.length || 0)
        + (req.files?.length || 0),
    }),
  }),

  createDepartmentContentController,
);

/**
 * PATCH /api/v1/assignments/manage/:assignmentId
 *
 * Update an assignment or practical.
 *
 * Existing attachments are retained only when included in the
 * submitted attachments array. Removed attachments are handled
 * by the controller after the database update succeeds.
 */
assignmentRouter.patch(
  '/manage/:assignmentId',
  authenticate,
  authorize(...contentManagerRoles),
  authRateLimiter,
  handleAssignmentUpload,
  parseMultipartArrays,
  validate(updateContentSchema),

  auditEvent({
    action: 'ASSIGNMENT_PRACTICAL_UPDATE',
    resourceType: 'Assignment',

    getMetadata: (req) => ({
      assignmentId: req.params.assignmentId,
      contentType: req.body.contentType || undefined,
      courseId: req.body.courseId || undefined,
      attachmentCount:
        (req.body.attachments?.length || 0)
        + (req.files?.length || 0),
    }),
  }),

  updateDepartmentContentController,
);

export default assignmentRouter;