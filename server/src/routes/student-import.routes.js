import { Router } from 'express';
import { z } from 'zod';

import {
  importStudentsController,
} from '../controllers/student-import.controller.js';

import {
  previewStudentImportController,
} from '../controllers/student-import-preview.controller.js';

import {
  downloadStudentImportTemplateController,
} from '../controllers/student-import-template.controller.js';

import {
  authenticate,
} from '../middleware/auth.middleware.js';

import { authorize } from '../middleware/authorize.middleware.js';

import {
  validate,
} from '../middleware/validate.middleware.js';

import {
  authRateLimiter,
} from '../middleware/rate-limit.middleware.js';

import studentUpload from '../middleware/student-upload.middleware.js';

import {
  studentImportIdempotencyMiddleware,
} from '../middleware/student-import-idempotency.middleware.js';

import {
  auditEvent,
} from '../middleware/audit.middleware.js';

const studentImportRouter = Router();

const MAX_IMPORT_SIZE = 1024 * 1024;

const sectionParamsSchema = z.object({
  sectionId: z.string().regex(
    /^[a-f\d]{24}$/i,
    'Invalid section ID.',
  ),
});

const importStudentsSchema = z.object({
  body: z.object({
    csvContent: z.string().max(
      MAX_IMPORT_SIZE,
      'CSV content must not exceed 1 MB.',
    ).optional(),
  }),

  params: sectionParamsSchema,
});

const previewStudentsSchema = z.object({
  body: z.object({
    csvContent: z.string().max(
      MAX_IMPORT_SIZE,
      'CSV content must not exceed 1 MB.',
    ).optional(),
  }),

  params: sectionParamsSchema,
});

/*
 * Download the official student import template.
 *
 * Audit metadata intentionally excludes request bodies,
 * uploaded file contents, credentials, and tokens.
 */
studentImportRouter.get(
  '/students/import-template',
  authenticate,
  authorize('MENTOR'),
  authRateLimiter,
  auditEvent({
    action: 'STUDENT_IMPORT_TEMPLATE_DOWNLOAD',
    resourceType: 'StudentImportTemplate',
    getMetadata: (req) => ({
      format: String(req.query.format || 'csv').toLowerCase(),
    }),
  }),
  downloadStudentImportTemplateController,
);

/*
 * Preview student imports before creating accounts.
 *
 * CSV:
 *   Send csvContent as JSON.
 *
 * XLSX:
 *   Send one .xlsx file using multipart field "file".
 *
 * Preview does not require an Idempotency-Key because it
 * does not create student accounts.
 */
studentImportRouter.post(
  '/sections/:sectionId/students/import-preview',
  authenticate,
  authorize('MENTOR'),
  authRateLimiter,
  auditEvent({
    action: 'STUDENT_IMPORT_PREVIEW',
    resourceType: 'StudentImport',
    getResourceId: (req) => req.params.sectionId,
    getMetadata: (req) => ({
      inputType: req.is('multipart/form-data')
        ? 'xlsx'
        : 'csv',
    }),
  }),
  studentUpload.single('file'),
  validate(previewStudentsSchema),
  previewStudentImportController,
);

/*
 * Perform the actual student import.
 *
 * Middleware order:
 * 1. Authenticate the caller.
 * 2. Authorize the mentor role.
 * 3. Apply rate limiting.
 * 4. Register audit logging for the completed response.
 * 5. Validate the Idempotency-Key.
 * 6. Parse the uploaded file.
 * 7. Validate request parameters and body.
 * 8. Execute the import controller.
 *
 * The audit middleware observes the final HTTP status.
 * It does not record CSV contents, XLSX contents, passwords,
 * Idempotency-Key values, or authentication tokens.
 */
studentImportRouter.post(
  '/sections/:sectionId/students/import',
  authenticate,
  authorize('MENTOR'),
  authRateLimiter,
  auditEvent({
    action: 'STUDENT_IMPORT',
    resourceType: 'StudentImport',
    getResourceId: (req) => req.params.sectionId,
    getMetadata: (req) => ({
      inputType: req.is('multipart/form-data')
        ? 'xlsx'
        : 'csv',
    }),
  }),
  studentImportIdempotencyMiddleware,
  studentUpload.single('file'),
  validate(importStudentsSchema),
  importStudentsController,
);

export default studentImportRouter;