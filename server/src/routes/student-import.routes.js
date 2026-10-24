import { Router } from 'express';
import { z } from 'zod';
import { importStudentsController } from '../controllers/student-import.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { authRateLimiter } from '../middleware/rate-limit.middleware.js';

import {
  downloadStudentImportTemplateController,
} from '../controllers/student-import-template.controller.js';

const studentImportRouter = Router();

const importStudentsSchema = z.object({
  body: z.object({
    csvContent: z
      .string()
      .min(1, 'CSV content is required.')
      .max(1024 * 1024, 'CSV content must not exceed 1 MB.'),
  }),
  params: z.object({
    sectionId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid section ID.'),
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
  validate(importStudentsSchema),
  importStudentsController,
);

export default studentImportRouter;