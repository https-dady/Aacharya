import { Router } from 'express';

import {
  listNotificationsController,
  unreadNotificationCountController,
  markNotificationAsReadController,
  markAllNotificationsAsReadController,
} from '../controllers/notification.controller.js';

import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

import { USER_ROLES } from '../models/user.model.js';

import {
  listNotificationsSchema,
  notificationIdParamsSchema,
  emptyNotificationRequestSchema,
} from '../validation/notification.validation.js';

const router = Router();

// Every notification endpoint requires authentication,
// a supported role, and verified email.
router.use(
  authenticate,
  authorize(...Object.values(USER_ROLES)),
);

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