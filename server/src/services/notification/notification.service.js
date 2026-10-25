import mongoose from 'mongoose';

import Notification, {
  NOTIFICATION_TYPES,
} from '../../models/notification.model.js';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const NOTIFICATION_TYPE_SET = new Set(NOTIFICATION_TYPES);

function createServiceError(message, code, statusCode = 400) {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.code = code;

  return error;
}

function assertValidObjectId(value, fieldName) {
  if (!mongoose.isValidObjectId(value)) {
    throw createServiceError(
      `${fieldName} must be a valid identifier.`,
      'INVALID_IDENTIFIER',
    );
  }
}

function normalizePagination({
  page = DEFAULT_PAGE,
  limit = DEFAULT_LIMIT,
} = {}) {
  if (!Number.isSafeInteger(page) || page < 1) {
    throw createServiceError(
      'page must be a positive integer.',
      'INVALID_PAGINATION',
    );
  }

  if (!Number.isSafeInteger(limit) || limit < 1) {
    throw createServiceError(
      'limit must be a positive integer.',
      'INVALID_PAGINATION',
    );
  }

  const normalizedLimit = Math.min(limit, MAX_LIMIT);
  const skip = (page - 1) * normalizedLimit;

  if (!Number.isSafeInteger(skip)) {
    throw createServiceError(
      'The requested page is too large.',
      'INVALID_PAGINATION',
    );
  }

  return {
    page,
    limit: normalizedLimit,
    skip,
  };
}

function buildPaginationMetadata({ page, limit, total }) {
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1 && totalPages > 0,
  };
}

function buildActiveNotificationFilter(recipientId) {
  return {
    recipientId,
    $or: [
      { expiresAt: null },
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } },
    ],
  };
}

function validateNotificationType(type) {
  if (type === undefined) {
    return;
  }

  if (
    typeof type !== 'string' ||
    !NOTIFICATION_TYPE_SET.has(type)
  ) {
    throw createServiceError(
      'The notification type is invalid.',
      'INVALID_NOTIFICATION_TYPE',
    );
  }
}

function validateActionUrl(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (
    typeof value !== 'string' ||
    value.length > 2048 ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\') ||
    /[\u0000-\u001F\u007F]/.test(value)
  ) {
    throw createServiceError(
      'Action URL must be a safe relative application path.',
      'INVALID_ACTION_URL',
    );
  }

  return value;
}

function sanitizeMetadata(metadata) {
  if (metadata === undefined || metadata === null) {
    return undefined;
  }

  if (
    typeof metadata !== 'object' ||
    Array.isArray(metadata) ||
    Object.getPrototypeOf(metadata) !== Object.prototype
  ) {
    throw createServiceError(
      'Notification metadata must be a plain object.',
      'INVALID_METADATA',
    );
  }

  let serialized;

  try {
    serialized = JSON.stringify(metadata);
  } catch {
    throw createServiceError(
      'Notification metadata must be serializable.',
      'INVALID_METADATA',
    );
  }

  if (serialized.length > 5000) {
    throw createServiceError(
      'Notification metadata cannot exceed 5000 characters.',
      'METADATA_TOO_LARGE',
    );
  }

  const sensitiveKeyPattern =
    /password|secret|token|authorization|cookie|credential|otp|privatekey|accesskey/i;

  function clean(value, depth = 0) {
    if (depth > 5) {
      throw createServiceError(
        'Notification metadata is nested too deeply.',
        'METADATA_TOO_DEEP',
      );
    }

    if (value === null || typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      return value.slice(0, 500);
    }

    if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        throw createServiceError(
          'Notification metadata contains an invalid number.',
          'INVALID_METADATA',
        );
      }

      return value;
    }

    if (Array.isArray(value)) {
      if (value.length > 50) {
        throw createServiceError(
          'Notification metadata arrays cannot exceed 50 items.',
          'INVALID_METADATA',
        );
      }

      return value.map((item) => clean(item, depth + 1));
    }

    if (typeof value === 'object') {
      const prototype = Object.getPrototypeOf(value);

      if (
        prototype !== Object.prototype &&
        prototype !== null
      ) {
        throw createServiceError(
          'Notification metadata contains an unsupported object.',
          'INVALID_METADATA',
        );
      }

      const entries = Object.entries(value);

      if (entries.length > 50) {
        throw createServiceError(
          'Notification metadata objects cannot exceed 50 keys.',
          'INVALID_METADATA',
        );
      }

      const result = {};

      for (const [key, nestedValue] of entries) {
        if (sensitiveKeyPattern.test(key)) {
          continue;
        }

        result[key] = clean(nestedValue, depth + 1);
      }

      return result;
    }

    throw createServiceError(
      'Notification metadata contains an unsupported value.',
      'INVALID_METADATA',
    );
  }

  return clean(metadata);
}

export async function createNotification(input) {
  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input)
  ) {
    throw createServiceError(
      'Notification input is required.',
      'INVALID_NOTIFICATION_INPUT',
    );
  }

  const {
    recipientId,
    actorId = null,
    type,
    title,
    message,
    priority = 'normal',
    resource,
    actionUrl,
    expiresAt,
    metadata,
  } = input;

  assertValidObjectId(recipientId, 'recipientId');

  if (actorId !== null) {
    assertValidObjectId(actorId, 'actorId');
  }

  validateNotificationType(type);

  if (
    typeof title !== 'string' ||
    !title.trim() ||
    title.trim().length > 160
  ) {
    throw createServiceError(
      'Title must contain between 1 and 160 characters.',
      'INVALID_NOTIFICATION_TITLE',
    );
  }

  if (
    typeof message !== 'string' ||
    !message.trim() ||
    message.trim().length > 2000
  ) {
    throw createServiceError(
      'Message must contain between 1 and 2000 characters.',
      'INVALID_NOTIFICATION_MESSAGE',
    );
  }

  let normalizedExpiresAt = null;

  if (expiresAt !== undefined && expiresAt !== null) {
    normalizedExpiresAt = new Date(expiresAt);

    if (
      Number.isNaN(normalizedExpiresAt.getTime()) ||
      normalizedExpiresAt <= new Date()
    ) {
      throw createServiceError(
        'expiresAt must be a valid future date.',
        'INVALID_EXPIRY_DATE',
      );
    }
  }

  return Notification.create({
    recipientId,
    actorId,
    type,
    title: title.trim(),
    message: message.trim(),
    priority,
    resource,
    actionUrl: validateActionUrl(actionUrl),
    expiresAt: normalizedExpiresAt,
    metadata: sanitizeMetadata(metadata),
  });
}

export async function listNotifications(
  recipientId,
  {
    page = DEFAULT_PAGE,
    limit = DEFAULT_LIMIT,
    unreadOnly = false,
    type,
  } = {},
) {
  assertValidObjectId(recipientId, 'recipientId');

  const pagination = normalizePagination({ page, limit });

  if (typeof unreadOnly !== 'boolean') {
    throw createServiceError(
      'unreadOnly must be a boolean.',
      'INVALID_UNREAD_FILTER',
    );
  }

  validateNotificationType(type);

  const filter = buildActiveNotificationFilter(recipientId);

  if (unreadOnly) {
    filter.readAt = null;
  }

  if (type !== undefined) {
    filter.type = type;
  }

  const [items, total] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean()
      .exec(),

    Notification.countDocuments(filter).exec(),
  ]);

  return {
    items,
    pagination: buildPaginationMetadata({
      page: pagination.page,
      limit: pagination.limit,
      total,
    }),
  };
}

export async function getUnreadNotificationCount(recipientId) {
  assertValidObjectId(recipientId, 'recipientId');

  return Notification.countDocuments({
    ...buildActiveNotificationFilter(recipientId),
    readAt: null,
  }).exec();
}

export async function markNotificationAsRead(
  recipientId,
  notificationId,
) {
  assertValidObjectId(recipientId, 'recipientId');
  assertValidObjectId(notificationId, 'notificationId');

  const filter = {
    _id: notificationId,
    recipientId,
  };

  const notification = await Notification.findOneAndUpdate(
    {
      ...filter,
      readAt: null,
    },
    {
      $set: { readAt: new Date() },
    },
    {
      new: true,
      runValidators: true,
    },
  ).exec();

  if (notification) {
    return notification;
  }

  const existing = await Notification.findOne(filter).exec();

  if (!existing) {
    throw createServiceError(
      'Notification was not found for this recipient.',
      'NOTIFICATION_NOT_FOUND',
      404,
    );
  }

  return existing;
}

export async function markAllNotificationsAsRead(recipientId) {
  assertValidObjectId(recipientId, 'recipientId');

  const result = await Notification.updateMany(
    {
      ...buildActiveNotificationFilter(recipientId),
      readAt: null,
    },
    {
      $set: { readAt: new Date() },
    },
    {
      runValidators: true,
    },
  ).exec();

  return {
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
  };
}

export default {
  createNotification,
  listNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};