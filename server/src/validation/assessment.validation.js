import { z } from 'zod';

import {
  ASSESSMENT_TYPES,
  ASSESSMENT_STATUSES,
} from '../models/assessment.model.js';

const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'A valid identifier is required.');

const emptyObjectSchema = z.object({}).strict();

const positiveIntegerQuerySchema = z
  .string()
  .regex(/^[1-9]\d*$/, 'Must be a positive integer.')
  .transform(Number)
  .refine(Number.isSafeInteger, {
    message: 'Must be a safe integer.',
  });

const assessmentTypeSchema = z.enum(
  Object.values(ASSESSMENT_TYPES),
);

const assessmentStatusSchema = z.enum(
  Object.values(ASSESSMENT_STATUSES),
);

const titleSchema = z
  .string()
  .trim()
  .min(2)
  .max(200);

const descriptionSchema = z
  .string()
  .trim()
  .max(5000)
  .optional();

const totalMarksSchema = z
  .coerce
  .number()
  .finite()
  .min(0.01)
  .max(10000);

const passingMarksSchema = z
  .coerce
  .number()
  .finite()
  .min(0)
  .max(10000);

const assessmentDateSchema = z.coerce.date();

const idArraySchema = z
  .array(objectIdSchema)
  .max(100)
  .optional()
  .default([]);

const assessmentFieldsSchema = {
  title: titleSchema.optional(),

  description: descriptionSchema,

  type: assessmentTypeSchema.optional(),

  courseId: objectIdSchema.optional(),

  batchIds: idArraySchema,

  sectionIds: idArraySchema,

  assessmentDate: assessmentDateSchema.optional(),

  totalMarks: totalMarksSchema.optional(),

  passingMarks: passingMarksSchema.optional(),

  status: assessmentStatusSchema.optional(),
};

const createAssessmentBodySchema = z
  .object({
    ...assessmentFieldsSchema,

    title: titleSchema,

    type: assessmentTypeSchema,

    courseId: objectIdSchema,

    assessmentDate: assessmentDateSchema,

    totalMarks: totalMarksSchema,

    passingMarks: passingMarksSchema,

    status: assessmentStatusSchema.optional(),
  })
  .strict()
  .refine(
    (body) => body.passingMarks <= body.totalMarks,
    {
      message: 'Passing marks cannot exceed total marks.',
      path: ['passingMarks'],
    },
  );

const updateAssessmentBodySchema = z
  .object(assessmentFieldsSchema)
  .strict()
  .refine(
    (body) => Object.keys(body).length > 0,
    {
      message: 'At least one field must be provided for an update.',
    },
  )
  .refine(
    (body) =>
      body.totalMarks === undefined ||
      body.passingMarks === undefined ||
      body.passingMarks <= body.totalMarks,
    {
      message: 'Passing marks cannot exceed total marks.',
      path: ['passingMarks'],
    },
  );

export const listAssessmentsSchema = z.object({
  params: emptyObjectSchema,

  query: z
    .object({
      page: positiveIntegerQuerySchema.optional(),

      limit: positiveIntegerQuerySchema
        .refine((value) => value <= 100, {
          message: 'Limit cannot exceed 100.',
        })
        .optional(),

      search: z.string().trim().max(200).optional(),

      type: assessmentTypeSchema.optional(),

      status: assessmentStatusSchema.optional(),

      courseId: objectIdSchema.optional(),

      batchId: objectIdSchema.optional(),

      sectionId: objectIdSchema.optional(),

      startDate: z.string().datetime().optional(),

      endDate: z.string().datetime().optional(),
    })
    .strict()
    .refine(
      (query) =>
        !query.startDate ||
        !query.endDate ||
        new Date(query.startDate) <= new Date(query.endDate),
      {
        message: 'End date must be on or after start date.',
        path: ['endDate'],
      },
    ),

  body: emptyObjectSchema,
});

export const createAssessmentSchema = z.object({
  params: emptyObjectSchema,

  query: emptyObjectSchema,

  body: createAssessmentBodySchema,
});

export const updateAssessmentSchema = z.object({
  params: z
    .object({
      assessmentId: objectIdSchema,
    })
    .strict(),

  query: emptyObjectSchema,

  body: updateAssessmentBodySchema,
});

export const assessmentIdParamsSchema = z.object({
  params: z
    .object({
      assessmentId: objectIdSchema,
    })
    .strict(),

  query: emptyObjectSchema,

  body: emptyObjectSchema,
});

export const listAssessmentResultsSchema = z.object({
  params: z
    .object({
      assessmentId: objectIdSchema,
    })
    .strict(),

  query: z
    .object({
      page: positiveIntegerQuerySchema.optional(),

      limit: positiveIntegerQuerySchema
        .refine((value) => value <= 100, {
          message: 'Limit cannot exceed 100.',
        })
        .optional(),

      search: z.string().trim().max(200).optional(),

      status: z.enum([
        'PENDING',
        'ENTERED',
        'ABSENT',
        'EXEMPT',
      ]).optional(),
    })
    .strict(),

  body: emptyObjectSchema,
});

export const updateAssessmentResultsSchema = z.object({
  params: z
    .object({
      assessmentId: objectIdSchema,
    })
    .strict(),

  query: emptyObjectSchema,

  body: z
    .object({
      results: z
        .array(
          z
            .object({
              studentId: objectIdSchema,

              status: z.enum([
                'PENDING',
                'ENTERED',
                'ABSENT',
                'EXEMPT',
              ]),

              marksObtained: z
                .number()
                .finite()
                .min(0)
                .max(10000)
                .nullable()
                .optional(),

              remarks: z
                .string()
                .trim()
                .max(1000)
                .optional(),
            })
            .strict(),
        )
        .min(1)
        .max(500),
    })
    .strict(),
});