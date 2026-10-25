import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import mongoose from 'mongoose';

import AuditEvent from '../src/models/audit-event.model.js';
import { auditEvent } from '../src/middleware/audit.middleware.js';

test('records the final response outcome rather than a pre-controller success', async (t) => {
  const originalCreate = AuditEvent.create;
  const events = [];
  AuditEvent.create = async (event) => {
    events.push(event);
    return event;
  };
  t.after(() => { AuditEvent.create = originalCreate; });

  const req = {
    user: { _id: new mongoose.Types.ObjectId().toString(), role: 'MENTOR' },
    params: { id: 'resource-1' },
    id: 'request-1',
  };
  const res = new EventEmitter();
  res.statusCode = 500;
  let nextCalled = false;

  auditEvent({ action: 'STUDENT_UPDATE', resourceType: 'Student' })(
    req,
    res,
    () => { nextCalled = true; },
  );
  assert.equal(nextCalled, true);
  res.emit('finish');
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(events.length, 1);
  assert.equal(events[0].outcome, 'FAILURE');
  assert.equal(events[0].resourceId, 'resource-1');
  assert.equal(events[0].requestId, 'request-1');
});

test('validates audit configuration', () => {
  assert.throws(() => auditEvent({ resourceType: 'Student' }), /action is required/);
  assert.throws(() => auditEvent({ action: 'OK' }), /resourceType is required/);
});
