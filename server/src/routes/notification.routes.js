import { Router } from 'express';

import {
  listNotificationsController,
  unreadNotificationCountController,
  markNotificationAsReadController,
  markAllNotificationsAsReadController,
} from '../controllers/notification.controller.js';

import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

import {
  listNotificationsSchema,
  notificationIdParamsSchema,
  emptyNotificationRequestSchema,
} from '../validation/notification.validation.js';

const router = Router();

// All notification endpoints require authentication.
router.use(authenticate);

// GET /api/v1/notifications/unread-count
router.get(
  '/unread-count',
  validate(emptyNotificationRequestSchema),
  unreadNotificationCountController,
);

// PATCH /api/v1/notifications/read-all
router.patch(
  '/read-all',
  validate(emptyNotificationRequestSchema),
  markAllNotificationsAsReadController,
);

// PATCH /api/v1/notifications/:notificationId/read
router.patch(
  '/:notificationId/read',
  validate(notificationIdParamsSchema),
  markNotificationAsReadController,
);

// GET /api/v1/notifications
router.get(
  '/',
  validate(listNotificationsSchema),
  listNotificationsController,
);

export default router;