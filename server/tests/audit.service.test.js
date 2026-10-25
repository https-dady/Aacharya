import test from 'node:test';
import assert from 'node:assert/strict';

import mongoose from 'mongoose';

import AuditEvent from '../src/models/audit-event.model.js';

import {
  recordAuditEvent,
  sanitizeAuditMetadata,
} from '../src/services/audit/audit.service.js';

test('redacts sensitive metadata keys', () => {
  const result = sanitizeAuditMetadata({
    action: 'STUDENT_CREATED',
    password: 'secret-password',
    accessToken: 'access-token-value',
    nested: {
      refresh_token: 'refresh-token-value',
      email: 'student@example.com',
    },
  });

  assert.equal(result.action, 'STUDENT_CREATED');
  assert.equal(result.password, '[REDACTED]');
  assert.equal(result.accessToken, '[REDACTED]');
  assert.equal(result.nested.refresh_token, '[REDACTED]');
  assert.equal(result.nested.email, 'student@example.com');
});

test('supports null and undefined metadata', () => {
  assert.equal(sanitizeAuditMetadata(null), undefined);
  assert.equal(sanitizeAuditMetadata(undefined), undefined);
});

test('rejects non-object metadata', () => {
  assert.throws(
    () => sanitizeAuditMetadata('invalid'),
    TypeError,
  );

  assert.throws(
    () => sanitizeAuditMetadata(['invalid']),
    TypeError,
  );
});

test('limits metadata string length', () => {
  const result = sanitizeAuditMetadata({
    description: 'a'.repeat(2000),
  });

  assert.equal(result.description.length, 1000);
});

test('limits metadata nesting depth', () => {
  const metadata = {
    level1: {
      level2: {
        level3: {
          level4: {
            level5: {
              level6: {
                value: 'deep',
              },
            },
          },
        },
      },
    },
  };

  const result = sanitizeAuditMetadata(metadata);

  assert.equal(
    result.level1.level2.level3.level4.level5.level6,
    '[REDACTED]',
  );
});

test('rejects unsupported actor roles', async () => {
  await assert.rejects(
    recordAuditEvent({
      actorRole: 'INVALID_ROLE',
      action: 'TEST_ACTION',
      resourceType: 'User',
      outcome: 'SUCCESS',
    }),
    /Unsupported audit actor role/,
  );
});

test('rejects unsupported outcomes', async () => {
  await assert.rejects(
    recordAuditEvent({
      action: 'TEST_ACTION',
      resourceType: 'User',
      outcome: 'UNKNOWN',
    }),
    /Unsupported audit outcome/,
  );
});

test('rejects missing action and resource type', async () => {
  await assert.rejects(
    recordAuditEvent({
      resourceType: 'User',
      outcome: 'SUCCESS',
    }),
    /Audit action is required/,
  );

  await assert.rejects(
    recordAuditEvent({
      action: 'TEST_ACTION',
      outcome: 'SUCCESS',
    }),
    /Audit resource type is required/,
  );
});

test('rejects non-string optional identifiers', async () => {
  await assert.rejects(
    recordAuditEvent({
      action: 'TEST_ACTION',
      resourceType: 'User',
      outcome: 'SUCCESS',
      requestId: 123,
    }),
    /requestId must be a string/,
  );

  await assert.rejects(
    recordAuditEvent({
      action: 'TEST_ACTION',
      resourceType: 'User',
      outcome: 'SUCCESS',
      resourceId: 123,
    }),
    /resourceId must be a string/,
  );
});

test('persists audit events with sanitized metadata', async (t) => {
  const originalCreate = AuditEvent.create;

  let capturedEvent;

  AuditEvent.create = async (event) => {
    capturedEvent = event;
    return event;
  };

  t.after(() => {
    AuditEvent.create = originalCreate;
  });

  const actorId = new mongoose.Types.ObjectId();

  const result = await recordAuditEvent({
    actorId,
    actorRole: 'MENTOR',
    action: 'STUDENT_ACCOUNT_CREATED',
    resourceType: 'User',
    resourceId: 'student-123',
    outcome: 'SUCCESS',
    requestId: 'request-123',
    metadata: {
      source: 'mentor-dashboard',
      password: 'must-not-be-stored',
      nested: {
        authorization: 'Bearer secret',
      },
    },
  });

  assert.equal(result, capturedEvent);
  assert.equal(capturedEvent.actorId, actorId);
  assert.equal(capturedEvent.actorRole, 'MENTOR');
  assert.equal(capturedEvent.action, 'STUDENT_ACCOUNT_CREATED');
  assert.equal(capturedEvent.resourceType, 'User');
  assert.equal(capturedEvent.resourceId, 'student-123');
  assert.equal(capturedEvent.outcome, 'SUCCESS');
  assert.equal(capturedEvent.requestId, 'request-123');

  assert.equal(
    capturedEvent.metadata.password,
    '[REDACTED]',
  );

  assert.equal(
    capturedEvent.metadata.nested.authorization,
    '[REDACTED]',
  );
});

test('propagates database persistence errors', async (t) => {
  const originalCreate = AuditEvent.create;
  const databaseError = new Error('Database unavailable');

  AuditEvent.create = async () => {
    throw databaseError;
  };

  t.after(() => {
    AuditEvent.create = originalCreate;
  });

  await assert.rejects(
    recordAuditEvent({
      action: 'TEST_ACTION',
      resourceType: 'User',
      outcome: 'SUCCESS',
    }),
    (error) => error === databaseError,
  );
});