import test from 'node:test';
import assert from 'node:assert/strict';

import express from 'express';
import request from 'supertest';

import {
  studentImportIdempotencyMiddleware,
} from '../src/middleware/student-import-idempotency.middleware.js';

function createTestApp() {
  const app = express();

  app.post(
    '/import',
    studentImportIdempotencyMiddleware,
    (req, res) => {
      res.status(200).json({
        success: true,
        idempotencyKey: req.idempotencyKey,
      });
    },
  );

  return app;
}

test(
  'accepts a valid Idempotency-Key and passes the normalized key to the controller',
  async () => {
    const app = createTestApp();

    const response = await request(app)
      .post('/import')
      .set('Idempotency-Key', '  student-import-001  ')
      .expect(200);

    assert.equal(response.body.success, true);
    assert.equal(
      response.body.idempotencyKey,
      'student-import-001',
    );
  },
);

test(
  'returns the standard error response when Idempotency-Key is missing',
  async () => {
    const app = createTestApp();

    const response = await request(app)
      .post('/import')
      .expect(400);

    assert.deepEqual(response.body, {
      success: false,
      error: {
        code: 'INVALID_IDEMPOTENCY_KEY',
        message: 'The Idempotency-Key header is required.',
      },
    });
  },
);

test(
  'rejects an Idempotency-Key shorter than the minimum length',
  async () => {
    const app = createTestApp();

    const response = await request(app)
      .post('/import')
      .set('Idempotency-Key', 'short-key')
      .expect(400);

    assert.equal(response.body.success, false);
    assert.equal(
      response.body.error.code,
      'INVALID_IDEMPOTENCY_KEY',
    );

    assert.match(
      response.body.error.message,
      /between 16 and 128 characters/i,
    );
  },
);

test(
  'rejects an Idempotency-Key longer than the maximum length',
  async () => {
    const app = createTestApp();

    const response = await request(app)
      .post('/import')
      .set('Idempotency-Key', 'a'.repeat(129))
      .expect(400);

    assert.equal(response.body.success, false);
    assert.equal(
      response.body.error.code,
      'INVALID_IDEMPOTENCY_KEY',
    );

    assert.match(
      response.body.error.message,
      /between 16 and 128 characters/i,
    );
  },
);

test(
  'rejects an Idempotency-Key containing unsupported characters',
  async () => {
    const app = createTestApp();

    const response = await request(app)
      .post('/import')
      .set('Idempotency-Key', 'student import key!')
      .expect(400);

    assert.deepEqual(response.body, {
      success: false,
      error: {
        code: 'INVALID_IDEMPOTENCY_KEY',
        message: 'Idempotency-Key contains unsupported characters.',
      },
    });
  },
);