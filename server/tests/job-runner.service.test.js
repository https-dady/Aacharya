import test from 'node:test';
import assert from 'node:assert/strict';

import {
  registerJob,
  executeJob,
  listRegisteredJobs,
  unregisterJob,
} from '../src/services/jobs/job-runner.service.js';

test('registers and executes a trusted handler', async () => {
  const name = 'test.echo';
  const remove = registerJob(name, async (payload) => ({ ...payload }));
  try {
    assert.deepEqual(await executeJob(name, { value: 7 }), { value: 7 });
    assert.ok(listRegisteredJobs().includes(name));
  } finally {
    remove();
  }
  assert.equal(listRegisteredJobs().includes(name), false);
});

test('rejects duplicate registration and invalid job names', () => {
  const name = 'test.duplicate';
  const remove = registerJob(name, async () => true);
  try {
    assert.throws(() => registerJob(name, async () => false), {
      code: 'JOB_ALREADY_REGISTERED',
    });
    assert.throws(() => registerJob('UPPER CASE', async () => true), {
      code: 'INVALID_JOB_NAME',
    });
  } finally {
    remove();
  }
});

test('rejects unknown jobs and non-object payloads', async () => {
  await assert.rejects(executeJob('test.missing'), {
    code: 'JOB_HANDLER_NOT_FOUND',
  });

  const remove = registerJob('test.payload', async () => true);
  try {
    await assert.rejects(executeJob('test.payload', []), {
      code: 'INVALID_JOB_PAYLOAD',
    });
  } finally {
    remove();
  }
});
