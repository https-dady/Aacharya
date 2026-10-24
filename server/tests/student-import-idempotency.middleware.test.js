import test from 'node:test';
import assert from 'node:assert/strict';

import express from 'express';
import request from 'supertest';

import {
  studentImportIdempotencyMiddleware,
} from '../src/middleware/student-import-idempotency.middleware.js';

test(
  'accepts a valid Idempotency-Key and passes the normalized key to the controller',
  async () => {
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

    const response = await request(app)
      .post('/import')
      .set('Idempotency-Key', '  student-import-001  ');

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(
      response.body.idempotencyKey,
      'student-import-001',
    );
  },
);

test(
  'rejects a request when Idempotency-Key is missing',
  async () => {
    const app = express();

    app.post(
      '/import',
      studentImportIdempotencyMiddleware,
      (_req, res) => {
        res.status(200).json({ success: true });
      },
    );

    const response = await request(app)
      .post('/import');

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
    assert.equal(
      response.body.code,
      'INVALID_IDEMPOTENCY_KEY',
    );
    assert.equal(
      response.body.message,
      'The Idempotency-Key header is required.',
    );
  },
);

test(
  'rejects an Idempotency-Key shorter than the minimum length',
  async () => {
    const app = express();

    app.post(
      '/import',
      studentImportIdempotencyMiddleware,
      (_req, res) => {
        res.status(200).json({ success: true });
      },
    );

    const response = await request(app)
      .post('/import')
      .set('Idempotency-Key', 'short-key');

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
    assert.equal(
      response.body.code,
      'INVALID_IDEMPOTENCY_KEY',
    );
  },
);

test(
  'rejects an Idempotency-Key longer than the maximum length',
  async () => {
    const app = express();

    app.post(
      '/import',
      studentImportIdempotencyMiddleware,
      (_req, res) => {
        res.status(200).json({ success: true });
      },
    );

    const response = await request(app)
      .post('/import')
      .set('Idempotency-Key', 'a'.repeat(129));

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
    assert.equal(
      response.body.code,
      'INVALID_IDEMPOTENCY_KEY',
    );
  },
);

test(
  'rejects an Idempotency-Key containing unsupported characters',
  async () => {
    const app = express();

    app.post(
      '/import',
      studentImportIdempotencyMiddleware,
      (_req, res) => {
        res.status(200).json({ success: true });
      },
    );

    const response = await request(app)
      .post('/import')
      .set('Idempotency-Key', 'student import key!');

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
    assert.equal(
      response.body.code,
      'INVALID_IDEMPOTENCY_KEY',
    );
    assert.match(
      response.body.message,
      /unsupported characters/i,
    );
  },
);