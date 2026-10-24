import { Router } from 'express';
import { z } from 'zod';
import {
  importStudentsController,
} from '../controllers/student-import.controller.js';
import {
  downloadStudentImportTemplateController,
} from '../controllers/student-import-template.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { authRateLimiter } from '../middleware/rate-limit.middleware.js';
import studentUpload from '../middleware/student-upload.middleware.js';

const studentImportRouter = Router();

const importStudentsSchema = z.object({
  body: z.object({
    csvContent: z.string().max(
      1024 * 1024,
      'CSV content must not exceed 1 MB.',
    ).optional(),
  }),
  params: z.object({
    sectionId: z.string().regex(
      /^[a-f\d]{24}$/i,
      'Invalid section ID.',
    ),
  }),
});

studentImportRouter.get(
  '/students/import-template',
  authenticate,
  authRateLimiter,
  downloadStudentImportTemplateController,
);

studentImportRouter.post(
  '/sections/:sectionId/students/import',
  authenticate,
  authRateLimiter,
  studentUpload.single('file'),
  validate(importStudentsSchema),
  importStudentsController,
);

export default studentImportRouter;