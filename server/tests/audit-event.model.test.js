import test from 'node:test';
import assert from 'node:assert/strict';

import mongoose from 'mongoose';

import AuditEvent, {
  AUDIT_ACTORS,
  AUDIT_OUTCOMES,
} from '../src/models/audit-event.model.js';

test('AuditEvent model is registered with strict schema settings', () => {
  assert.equal(AuditEvent.modelName, 'AuditEvent');
  assert.equal(AuditEvent.schema.options.strict, 'throw');
  assert.equal(AuditEvent.schema.options.versionKey, false);
});

test('defines the supported actor roles', () => {
  assert.deepEqual(AUDIT_ACTORS, [
    'SUPER_ADMIN',
    'HOD',
    'FACULTY',
    'MENTOR',
    'STUDENT',
    'SYSTEM',
  ]);
});

test('defines the supported audit outcomes', () => {
  assert.deepEqual(AUDIT_OUTCOMES, [
    'SUCCESS',
    'FAILURE',
  ]);
});

test('requires action, resourceType, and outcome', async () => {
  const event = new AuditEvent({});

  await assert.rejects(
    event.validate(),
    (error) => {
      assert.ok(
        error instanceof mongoose.Error.ValidationError,
      );

      assert.ok(error.errors.action);
      assert.ok(error.errors.resourceType);
      assert.ok(error.errors.outcome);

      return true;
    },
  );
});

test('accepts a valid audit event', async () => {
  const actorId = new mongoose.Types.ObjectId();

  const event = new AuditEvent({
    actorId,
    actorRole: 'MENTOR',
    action: 'STUDENT_ACCOUNT_CREATED',
    resourceType: 'User',
    resourceId: new mongoose.Types.ObjectId().toString(),
    outcome: 'SUCCESS',
    requestId: 'request-test-001',
    metadata: {
      source: 'mentor-dashboard',
    },
  });

  await event.validate();

  assert.equal(event.actorId.toString(), actorId.toString());
  assert.equal(event.actorRole, 'MENTOR');
  assert.equal(event.action, 'STUDENT_ACCOUNT_CREATED');
  assert.equal(event.resourceType, 'User');
  assert.equal(event.outcome, 'SUCCESS');
  assert.equal(event.metadata.source, 'mentor-dashboard');
  assert.ok(event.occurredAt instanceof Date);
});

test('rejects an unsupported actor role', async () => {
  const event = new AuditEvent({
    actorRole: 'INVALID_ROLE',
    action: 'TEST_ACTION',
    resourceType: 'User',
    outcome: 'SUCCESS',
  });

  await assert.rejects(
    event.validate(),
    (error) => {
      assert.ok(error.errors.actorRole);
      return true;
    },
  );
});

test('rejects an unsupported audit outcome', async () => {
  const event = new AuditEvent({
    action: 'TEST_ACTION',
    resourceType: 'User',
    outcome: 'UNKNOWN',
  });

  await assert.rejects(
    event.validate(),
    (error) => {
      assert.ok(error.errors.outcome);
      return true;
    },
  );
});

test('rejects an empty action and resource type', async () => {
  const event = new AuditEvent({
    action: ' ',
    resourceType: ' ',
    outcome: 'SUCCESS',
  });

  await assert.rejects(
    event.validate(),
    (error) => {
      assert.ok(error.errors.action);
      assert.ok(error.errors.resourceType);
      return true;
    },
  );
});

test('defines indexes for actor, resource, and action lookups', () => {
  const indexes = AuditEvent.schema.indexes();

  const hasIndex = (expectedFields) =>
    indexes.some(([fields]) =>
      Object.entries(expectedFields).every(
        ([field, direction]) => fields[field] === direction,
      ),
    );

  assert.ok(
    hasIndex({ actorId: 1, occurredAt: -1 }),
    'Expected actor activity lookup index.',
  );

  assert.ok(
    hasIndex({
      resourceType: 1,
      resourceId: 1,
      occurredAt: -1,
    }),
    'Expected resource activity lookup index.',
  );

  assert.ok(
    hasIndex({ action: 1, occurredAt: -1 }),
    'Expected action lookup index.',
  );
});

test('rejects fields not defined in the audit schema', () => {
  assert.throws(
    () =>
      new AuditEvent({
        action: 'TEST_ACTION',
        resourceType: 'User',
        outcome: 'SUCCESS',
        password: 'must-not-be-stored',
      }),
    (error) => {
      assert.ok(error instanceof mongoose.Error.StrictModeError);
      assert.equal(error.path, 'password');
      return true;
    },
  );
});