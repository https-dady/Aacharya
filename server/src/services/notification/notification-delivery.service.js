import { User } from '../../models/user.model.js';
import { createNotification } from './notification.service.js';
import { sendTransactionalEmail } from '../email/email.service.js';

function createDeliveryError(message, code, statusCode = 400) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;

  return error;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * Creates an in-app notification for a user.
 *
 * Notification creation and email delivery are deliberately separate:
 * an email provider failure must not erase a persisted in-app notification.
 */
export async function deliverInAppNotification(input) {
  return createNotification(input);
}

/**
 * Sends a transactional email to an existing user.
 *
 * The recipient is resolved from the database instead of trusting
 * an arbitrary email address supplied by a client.
 */
export async function deliverUserEmail({
  recipientId,
  subject,
  textContent,
}) {
  if (
    typeof recipientId !== 'string' ||
    !/^[a-f\d]{24}$/i.test(recipientId)
  ) {
    throw createDeliveryError(
      'A valid recipient ID is required.',
      'INVALID_RECIPIENT_ID',
    );
  }

  if (typeof subject !== 'string' || !subject.trim()) {
    throw createDeliveryError(
      'An email subject is required.',
      'INVALID_EMAIL_SUBJECT',
    );
  }

  if (typeof textContent !== 'string' || !textContent.trim()) {
    throw createDeliveryError(
      'Email text content is required.',
      'INVALID_EMAIL_CONTENT',
    );
  }

  const user = await User.findById(recipientId)
    .select('email fullName status')
    .lean()
    .exec();

  if (!user) {
    throw createDeliveryError(
      'The notification recipient was not found.',
      'RECIPIENT_NOT_FOUND',
      404,
    );
  }

  if (user.status !== 'ACTIVE') {
    throw createDeliveryError(
      'Email cannot be sent to an inactive account.',
      'RECIPIENT_INACTIVE',
      403,
    );
  }

  if (!user.email) {
    throw createDeliveryError(
      'The recipient does not have an email address.',
      'RECIPIENT_EMAIL_MISSING',
      422,
    );
  }

  const safeName = escapeHtml(user.fullName || 'User');
  const safeMessage = escapeHtml(textContent.trim());

  const htmlContent = [
    '<!doctype html>',
    '<html lang="en">',
    '<head><meta charset="utf-8"></head>',
    '<body>',
    `<p>Hello ${safeName},</p>`,
    `<p>${safeMessage.replace(/\r?\n/g, '<br>')}</p>`,
    '<p>Aacharya LMS</p>',
    '</body>',
    '</html>',
  ].join('');

  return sendTransactionalEmail({
    to: user.email,
    subject: subject.trim(),
    htmlContent,
    textContent: textContent.trim(),
  });
}

export default {
  deliverInAppNotification,
  deliverUserEmail,
};