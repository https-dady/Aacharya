import test from 'node:test';
import assert from 'node:assert/strict';

import {
  listNotificationsSchema,
  notificationIdParamsSchema,
  emptyNotificationRequestSchema,
} from '../src/validation/notification.validation.js';

test('transforms list pagination query values', () => {
  const result = listNotificationsSchema.safeParse({
    body: {},
    params: {},
    query: { page: '2', limit: '25', unreadOnly: 'true', type: 'assignment' },
  });
  assert.equal(result.success, true);
  assert.equal(result.data.query.page, 2);
  assert.equal(result.data.query.limit, 25);
  assert.equal(result.data.query.unreadOnly, 'true');
});

test('rejects invalid notification type and malformed identifiers', () => {
  assert.equal(listNotificationsSchema.safeParse({
    body: {}, params: {}, query: { type: 'unknown' },
  }).success, false);

  assert.equal(notificationIdParamsSchema.safeParse({
    body: {}, params: { notificationId: 'not-an-id' }, query: {},
  }).success, false);
});

test('allows empty notification action requests', () => {
  assert.equal(emptyNotificationRequestSchema.safeParse({
    body: {}, params: {}, query: {},
  }).success, true);
});
