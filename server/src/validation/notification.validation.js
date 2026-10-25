import { z } from 'zod';

const emptyObjectSchema = z.object({}).strict();

const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'A valid identifier is required.');

const positiveIntegerQuerySchema = z
  .string()
  .regex(/^[1-9]\d*$/, 'Must be a positive integer.')
  .transform(Number)
  .refine(Number.isSafeInteger, {
    message: 'Must be a safe integer.',
  });

const notificationTypeSchema = z.enum([
  'system',
  'announcement',
  'academic',
  'attendance',
  'assignment',
  'result',
  'message',
  'reminder',
]);

export const listNotificationsSchema = z.object({
  body: emptyObjectSchema.optional().default({}),

  params: emptyObjectSchema,

  query: z.object({
    page: positiveIntegerQuerySchema.optional(),
    limit: positiveIntegerQuerySchema.optional(),
    unreadOnly: z.enum(['true', 'false']).optional(),
    type: notificationTypeSchema.optional(),
  }).passthrough(),
});

export const notificationIdParamsSchema = z.object({
  body: emptyObjectSchema.optional().default({}),

  params: z.object({
    notificationId: objectIdSchema,
  }).strict(),

  query: z.object({}).passthrough(),
});

export const emptyNotificationRequestSchema = z.object({
  body: emptyObjectSchema.optional().default({}),

  params: emptyObjectSchema,

  query: z.object({}).passthrough(),
});