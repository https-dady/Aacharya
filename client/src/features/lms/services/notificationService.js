import api from '../../../auth/services/api/axios.js';

const NOTIFICATION_BASE_URL = '/v1/notifications';

const VALID_NOTIFICATION_TYPES = [
  'system',
  'announcement',
  'academic',
  'attendance',
  'assignment',
  'result',
  'message',
  'reminder',
];

function unwrapResponse(response) {
  const body = response?.data;

  if (!body || body.success !== true) {
    throw new Error(
      body?.message || 'Unable to process the notification response.',
    );
  }

  return body;
}

function normalizeListOptions(options = {}) {
  const params = {};

  if (options.page !== undefined) {
    params.page = options.page;
  }

  if (options.limit !== undefined) {
    params.limit = options.limit;
  }

  if (options.unreadOnly !== undefined) {
    params.unreadOnly = String(Boolean(options.unreadOnly));
  }

  if (options.type !== undefined && options.type !== '') {
    if (!VALID_NOTIFICATION_TYPES.includes(options.type)) {
      throw new Error('Invalid notification type.');
    }

    params.type = options.type;
  }

  return params;
}

function validateNotificationId(notificationId) {
  if (
    typeof notificationId !== 'string' ||
    !/^[a-f\d]{24}$/i.test(notificationId)
  ) {
    throw new Error('A valid notification ID is required.');
  }

  return notificationId;
}

const notificationService = {
  /**
   * Retrieve the authenticated user's notifications.
   *
   * Backend:
   * GET /api/v1/notifications
   *
   * Returns:
   * {
   *   items: Notification[],
   *   pagination: PaginationMetadata
   * }
   */
  async getNotifications(options = {}) {
    const response = await api.get(NOTIFICATION_BASE_URL, {
      params: normalizeListOptions(options),
    });

    const body = unwrapResponse(response);

    if (!Array.isArray(body.data)) {
      throw new Error(
        'The notifications endpoint returned an invalid list.',
      );
    }

    return {
      items: body.data,
      pagination: body.pagination ?? null,
    };
  },

  /**
   * Retrieve the authenticated user's unread notification count.
   *
   * Backend:
   * GET /api/v1/notifications/unread-count
   */
  async getUnreadCount() {
    const response = await api.get(
      `${NOTIFICATION_BASE_URL}/unread-count`,
    );

    const body = unwrapResponse(response);
    const unreadCount = body.data?.unreadCount;

    if (!Number.isSafeInteger(unreadCount) || unreadCount < 0) {
      throw new Error(
        'The unread notification count is invalid.',
      );
    }

    return unreadCount;
  },

  /**
   * Mark one notification as read.
   *
   * Backend:
   * PATCH /api/v1/notifications/:notificationId/read
   */
  async markAsRead(notificationId) {
    const validId = validateNotificationId(notificationId);

    const response = await api.patch(
      `${NOTIFICATION_BASE_URL}/${validId}/read`,
    );

    const body = unwrapResponse(response);

    return body.data;
  },

  /**
   * Mark all notifications belonging to the authenticated user as read.
   *
   * Backend:
   * PATCH /api/v1/notifications/read-all
   */
  async markAllAsRead() {
    const response = await api.patch(
      `${NOTIFICATION_BASE_URL}/read-all`,
    );

    const body = unwrapResponse(response);

    return {
      matchedCount: body.data?.matchedCount ?? 0,
      modifiedCount: body.data?.modifiedCount ?? 0,
    };
  },
};

export default notificationService;