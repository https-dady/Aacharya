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

import {
  validate,
} from '../middleware/validate.middleware.js';

import {
  authRateLimiter,
} from '../middleware/rate-limit.middleware.js';

import studentUpload from '../middleware/student-upload.middleware.js';

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
 */
studentImportRouter.get(
  '/students/import-template',
  authenticate,
  authRateLimiter,
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
 * The controller returns row-level duplicate information
 * without creating or modifying student accounts.
 */
studentImportRouter.post(
  '/sections/:sectionId/students/import-preview',
  authenticate,
  authRateLimiter,
  studentUpload.single('file'),
  validate(previewStudentsSchema),
  previewStudentImportController,
);

/*
 * Perform the actual student import.
 *
 * This remains a separate endpoint from preview.
 */
studentImportRouter.post(
  '/sections/:sectionId/students/import',
  authenticate,
  authRateLimiter,
  studentUpload.single('file'),
  validate(importStudentsSchema),
  importStudentsController,
);

export default studentImportRouter;