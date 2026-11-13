import { Router } from 'express';
import { z } from 'zod';

import {
  createDepartmentCourseController,
  listDepartmentCoursesController,
  listMyCoursesController,
} from '../controllers/course.controller.js';

import {
  listMyAssignedCoursesController,
} from '../controllers/faculty-course.controller.js';

import {
  listFacultyCourseMaterialsController,
  getFacultyCourseMaterialController,
  createFacultyCourseMaterialController,
  archiveFacultyCourseMaterialController,
} from '../controllers/faculty-course-material.controller.js';

import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { authRateLimiter } from '../middleware/rate-limit.middleware.js';
import { auditEvent } from '../middleware/audit.middleware.js';

import {
  courseMaterialUpload,
} from '../middleware/course-material-upload.middleware.js';

import {
  COURSE_MATERIAL_TYPES,
} from '../models/course-material.model.js';

import {
  COURSE_CATEGORIES,
  COURSE_STATUSES,
} from '../models/course.model.js';

const courseRouter = Router();

const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'A valid MongoDB ID is required.');

const courseCategorySchema = z.enum(
  Object.values(COURSE_CATEGORIES),
);

const courseStatusSchema = z.enum(
  Object.values(COURSE_STATUSES),
);

const materialTypeSchema = z.enum(
  Object.values(COURSE_MATERIAL_TYPES),
);

const emptyObjectSchema = z.object({}).strict();

const listDepartmentCoursesSchema = z.object({
  params: emptyObjectSchema,
  body: emptyObjectSchema,

  query: z.object({
    page: z.coerce.number().int().min(1).max(100000).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    search: z.string().trim().max(100).optional(),
    status: courseStatusSchema.optional(),
  }).strict(),
});

const createDepartmentCourseSchema = z.object({
  params: emptyObjectSchema,
  query: emptyObjectSchema,

  body: z.object({
    title: z.string().trim().min(2).max(150),

    code: z.string()
      .trim()
      .min(2)
      .max(30)
      .regex(
        /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/,
        'Course code can contain letters, numbers, and hyphen-separated segments.',
      ),

    description: z.string().trim().max(2000).optional(),

    instructorId: objectIdSchema.nullable().optional(),

    batchIds: z.array(objectIdSchema).max(100).optional(),

    sectionIds: z.array(objectIdSchema).max(500).optional(),

    semester: z.string().trim().max(30).optional(),

    category: courseCategorySchema.optional(),

    credits: z.coerce.number().min(0).max(30).optional(),
  }).strict(),
});

const courseMaterialsParamsSchema = z.object({
  params: z.object({
    courseId: objectIdSchema,
  }).strict(),

  body: emptyObjectSchema,

  query: z.object({
    page: z.coerce.number().int().min(1).max(100000).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    type: materialTypeSchema.optional(),
    moduleName: z.string().trim().min(1).max(120).optional(),
  }).strict(),
});

const courseMaterialDetailsParamsSchema = z.object({
  params: z.object({
    courseId: objectIdSchema,
    materialId: objectIdSchema,
  }).strict(),

  body: emptyObjectSchema,
  query: emptyObjectSchema,
});

const createCourseMaterialSchema = z.object({
  params: z.object({
    courseId: objectIdSchema,
  }).strict(),

  query: emptyObjectSchema,

  body: z.object({
    title: z.string().trim().min(2).max(120),

    description: z.string().trim().max(2000).optional().default(''),

    moduleName: z.string().trim().min(1).max(120),

    type: materialTypeSchema,

    resourceUrl: z.string().trim().max(2048).optional(),
  }).strict().superRefine((data, context) => {
    if (
      data.type === COURSE_MATERIAL_TYPES.VIDEO
      || data.type === COURSE_MATERIAL_TYPES.EXTERNAL
    ) {
      if (!data.resourceUrl) {
        context.addIssue({
          code: 'custom',
          path: ['resourceUrl'],
          message: 'A resource URL is required for video and external materials.',
        });
      }
    }

    if (
      data.type === COURSE_MATERIAL_TYPES.DOCUMENT
      && data.resourceUrl
    ) {
      context.addIssue({
        code: 'custom',
        path: ['resourceUrl'],
        message: 'Document materials must use an uploaded file.',
      });
    }
  }),
});

const archiveCourseMaterialSchema = z.object({
  params: z.object({
    courseId: objectIdSchema,
    materialId: objectIdSchema,
  }).strict(),

  body: emptyObjectSchema,
  query: emptyObjectSchema,
});

/**
 * Translate Multer errors into API-friendly errors.
 */
function handleCourseMaterialUpload(req, res, next) {
  courseMaterialUpload(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error.code === 'LIMIT_FILE_SIZE') {
      error.statusCode = 413;
      error.code = 'MATERIAL_FILE_TOO_LARGE';
      error.message = 'Course material files cannot exceed 25 MB.';
      error.expose = true;

      return next(error);
    }

    if (error.code === 'LIMIT_FILE_COUNT') {
      error.statusCode = 400;
      error.code = 'TOO_MANY_MATERIAL_FILES';
      error.message = 'Only one document file can be uploaded per request.';
      error.expose = true;

      return next(error);
    }

    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      error.statusCode = 400;
      error.code = 'UNEXPECTED_MATERIAL_FILE_FIELD';
      error.message = 'Upload the document using the file field.';
      error.expose = true;

      return next(error);
    }

    return next(error);
  });
}

/* -------------------------------------------------------------------------- */
/* Student course access                                                       */
/* -------------------------------------------------------------------------- */

/**
 * GET /api/v1/courses/me
 */
courseRouter.get(
  '/me',
  authenticate,
  authorize('STUDENT'),
  authRateLimiter,
  listMyCoursesController,
);

/* -------------------------------------------------------------------------- */
/* Faculty and HOD assigned courses                                            */
/* -------------------------------------------------------------------------- */

/**
 * GET /api/v1/courses/assigned-to-me
 */
courseRouter.get(
  '/assigned-to-me',
  authenticate,
  authorize('FACULTY', 'HOD'),
  authRateLimiter,
  listMyAssignedCoursesController,
);

/* -------------------------------------------------------------------------- */
/* Faculty course materials                                                   */
/* -------------------------------------------------------------------------- */

/**
 * GET /api/v1/courses/:courseId/materials
 */
courseRouter.get(
  '/:courseId/materials',
  authenticate,
  authorize('FACULTY'),
  authRateLimiter,
  validate(courseMaterialsParamsSchema),
  listFacultyCourseMaterialsController,
);

/**
 * GET /api/v1/courses/:courseId/materials/:materialId
 */
courseRouter.get(
  '/:courseId/materials/:materialId',
  authenticate,
  authorize('FACULTY'),
  authRateLimiter,
  validate(courseMaterialDetailsParamsSchema),
  getFacultyCourseMaterialController,
);

/**
 * POST /api/v1/courses/:courseId/materials
 */
courseRouter.post(
  '/:courseId/materials',
  authenticate,
  authorize('FACULTY'),
  authRateLimiter,
  handleCourseMaterialUpload,
  validate(createCourseMaterialSchema),

  auditEvent({
    action: 'COURSE_MATERIAL_CREATE',
    resourceType: 'CourseMaterial',

    getMetadata: (req) => ({
      courseId: req.params.courseId,
      materialType: req.body.type,
      moduleName: req.body.moduleName,
      fileUploaded: Boolean(req.file),
    }),
  }),

  createFacultyCourseMaterialController,
);

/**
 * PATCH /api/v1/courses/:courseId/materials/:materialId/archive
 */
courseRouter.patch(
  '/:courseId/materials/:materialId/archive',
  authenticate,
  authorize('FACULTY'),
  authRateLimiter,
  validate(archiveCourseMaterialSchema),

  auditEvent({
    action: 'COURSE_MATERIAL_ARCHIVE',
    resourceType: 'CourseMaterial',

    getMetadata: (req) => ({
      courseId: req.params.courseId,
      materialId: req.params.materialId,
    }),
  }),

  archiveFacultyCourseMaterialController,
);

/* -------------------------------------------------------------------------- */
/* HOD department course management                                            */
/* -------------------------------------------------------------------------- */

/**
 * GET /api/v1/courses/department
 */
courseRouter.get(
  '/department',
  authenticate,
  authorize('HOD'),
  validate(listDepartmentCoursesSchema),
  listDepartmentCoursesController,
);

/**
 * POST /api/v1/courses/department
 */
courseRouter.post(
  '/department',
  authenticate,
  authorize('HOD'),
  authRateLimiter,
  validate(createDepartmentCourseSchema),

  auditEvent({
    action: 'COURSE_CREATE',
    resourceType: 'Course',

    getMetadata: (req) => ({
      courseCode: req.body.code.trim().toUpperCase(),
      category: req.body.category || COURSE_CATEGORIES.CORE,
      instructorAssigned: Boolean(req.body.instructorId),
      batchCount: req.body.batchIds?.length || 0,
      sectionCount: req.body.sectionIds?.length || 0,
    }),
  }),

  createDepartmentCourseController,
);

export default courseRouter;