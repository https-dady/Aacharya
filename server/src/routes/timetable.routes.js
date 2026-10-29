import { Router } from 'express';
import { z } from 'zod';

import {
  listTimetableController,
  createTimetableController,
  updateTimetableController,
  deleteTimetableController,
} from '../controllers/timetable.controller.js';

import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { authRateLimiter } from '../middleware/rate-limit.middleware.js';
import { auditEvent } from '../middleware/audit.middleware.js';

import {
  TIMETABLE_DAYS,
} from '../models/timetable.model.js';

const timetableRouter = Router();

const objectIdSchema = z
  .string()
  .regex(
    /^[a-f\d]{24}$/i,
    'A valid MongoDB ID is required.',
  );

const timeSchema = z
  .string()
  .regex(
    /^(?:[01]\d|2[0-3]):[0-5]\d$/,
    'Time must use 24-hour HH:mm format.',
  );

const daySchema = z.enum(TIMETABLE_DAYS);

const statusSchema = z.enum([
  'ACTIVE',
  'CANCELLED',
]);

const listTimetableSchema = z.object({
  params: z.object({}).strict(),

  body: z.object({}).strict(),

  query: z.object({
    page: z.coerce
      .number()
      .int()
      .min(1)
      .max(100000)
      .optional(),

    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .optional(),

    day: daySchema.optional(),

    status: statusSchema.optional(),

    courseId: objectIdSchema.optional(),

    facultyId: objectIdSchema.optional(),

    batchId: objectIdSchema.optional(),

    sectionId: objectIdSchema.optional(),

    search: z.string().trim().max(100).optional(),
  }).strict(),
});

const createTimetableSchema = z.object({
  params: z.object({}).strict(),

  query: z.object({}).strict(),

  body: z.object({
    courseId: objectIdSchema,

    facultyId: objectIdSchema,

    batchId: objectIdSchema,

    sectionId: objectIdSchema,

    day: daySchema,

    startTime: timeSchema,

    endTime: timeSchema,

    room: z.string().trim().min(1).max(100),
  }).strict().refine(
    (body) => body.startTime < body.endTime,
    {
      message: 'End time must be later than start time.',
      path: ['endTime'],
    },
  ),
});

const updateTimetableSchema = z.object({
  params: z.object({
    timetableId: objectIdSchema,
  }).strict(),

  query: z.object({}).strict(),

  body: z.object({
    courseId: objectIdSchema.optional(),

    facultyId: objectIdSchema.optional(),

    batchId: objectIdSchema.optional(),

    sectionId: objectIdSchema.optional(),

    day: daySchema.optional(),

    startTime: timeSchema.optional(),

    endTime: timeSchema.optional(),

    room: z.string().trim().min(1).max(100).optional(),

    status: statusSchema.optional(),
  }).strict().refine(
    (body) => Object.keys(body).length > 0,
    {
      message: 'Provide at least one field to update.',
    },
  ).refine(
    (body) => {
      if (body.startTime && body.endTime) {
        return body.startTime < body.endTime;
      }

      return true;
    },
    {
      message: 'End time must be later than start time.',
      path: ['endTime'],
    },
  ),
});

const deleteTimetableSchema = z.object({
  params: z.object({
    timetableId: objectIdSchema,
  }).strict(),

  body: z.object({}).strict(),

  query: z.object({}).strict(),
});

/**
 * List timetable entries belonging to the authenticated HOD's
 * department.
 *
 * GET /api/v1/timetable/manage
 *
 * Supported filters:
 * - page
 * - limit
 * - day
 * - status
 * - courseId
 * - facultyId
 * - batchId
 * - sectionId
 * - search
 */
timetableRouter.get(
  '/manage',
  authenticate,
  authorize('HOD'),
  validate(listTimetableSchema),
  listTimetableController,
);

/**
 * Create a timetable entry.
 *
 * The controller resolves the department from the authenticated HOD.
 *
 * POST /api/v1/timetable/manage
 */
timetableRouter.post(
  '/manage',
  authenticate,
  authorize('HOD'),
  authRateLimiter,
  validate(createTimetableSchema),

  auditEvent({
    action: 'TIMETABLE_CREATE',
    resourceType: 'Timetable',

    getMetadata: (req) => ({
      courseId: req.body.courseId,
      facultyId: req.body.facultyId,
      batchId: req.body.batchId,
      sectionId: req.body.sectionId,
      day: req.body.day,
      startTime: req.body.startTime,
      endTime: req.body.endTime,
      room: req.body.room,
    }),
  }),

  createTimetableController,
);

/**
 * Update an existing timetable entry.
 *
 * The controller must verify that the entry belongs to the
 * authenticated HOD's department.
 *
 * PATCH /api/v1/timetable/manage/:timetableId
 */
timetableRouter.patch(
  '/manage/:timetableId',
  authenticate,
  authorize('HOD'),
  authRateLimiter,
  validate(updateTimetableSchema),

  auditEvent({
    action: 'TIMETABLE_UPDATE',
    resourceType: 'Timetable',

    getResourceId: (req) => req.params.timetableId,

    getMetadata: (req) => ({
      updatedFields: Object.keys(req.body),
      status: req.body.status,
    }),
  }),

  updateTimetableController,
);

/**
 * Delete an existing timetable entry.
 *
 * The controller must verify department ownership before deletion.
 *
 * DELETE /api/v1/timetable/manage/:timetableId
 */
timetableRouter.delete(
  '/manage/:timetableId',
  authenticate,
  authorize('HOD'),
  authRateLimiter,
  validate(deleteTimetableSchema),

  auditEvent({
    action: 'TIMETABLE_DELETE',
    resourceType: 'Timetable',

    getResourceId: (req) => req.params.timetableId,
  }),

  deleteTimetableController,
);

export default timetableRouter;