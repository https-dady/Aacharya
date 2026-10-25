import {
  listNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../services/notifications/notification.service.js';

function createControllerError(message, code, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;

  return error;
}

function getAuthenticatedUserId(req) {
  const userId = req.user?._id ?? req.user?.id;

  if (!userId) {
    throw createControllerError(
      'Authentication is required.',
      'AUTHENTICATION_REQUIRED',
      401,
    );
  }

  return userId;
}

function getValidatedQuery(req) {
  return req.validated?.query ?? req.query;
}

function getValidatedParams(req) {
  return req.validated?.params ?? req.params;
}

/**
 * GET /api/v1/notifications
 */
export async function listNotificationsController(req, res, next) {
  try {
    const recipientId = getAuthenticatedUserId(req);
    const query = getValidatedQuery(req);

    const result = await listNotifications(recipientId, {
      page: query.page,
      limit: query.limit,
      unreadOnly: query.unreadOnly === true
        || query.unreadOnly === 'true',
      type: query.type,
    });

    return res.status(200).json({
      success: true,
      data: result.items,
      pagination: result.pagination,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/v1/notifications/unread-count
 */
export async function unreadNotificationCountController(req, res, next) {
  try {
    const recipientId = getAuthenticatedUserId(req);

    const count = await getUnreadNotificationCount(recipientId);

    return res.status(200).json({
      success: true,
      data: {
        unreadCount: count,
      },
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * PATCH /api/v1/notifications/:notificationId/read
 */
export async function markNotificationAsReadController(req, res, next) {
  try {
    const recipientId = getAuthenticatedUserId(req);
    const params = getValidatedParams(req);

    const notification = await markNotificationAsRead(
      recipientId,
      params.notificationId,
    );

    return res.status(200).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * PATCH /api/v1/notifications/read-all
 */
export async function markAllNotificationsAsReadController(req, res, next) {
  try {
    const recipientId = getAuthenticatedUserId(req);

    const result = await markAllNotificationsAsRead(recipientId);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}