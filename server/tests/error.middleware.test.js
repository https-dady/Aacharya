import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import request from 'supertest';

import {
  errorHandler,
  notFoundHandler,
} from '../src/middleware/error.middleware.js';

function createTestApp(routeHandler) {
  const app = express();

  app.get('/test-error', routeHandler);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

test('Unexpected server errors do not expose internal messages', async () => {
  const app = createTestApp((_req, _res, next) => {
    next(new Error('Sensitive database connection details'));
  });

  const response = await request(app)
    .get('/test-error')
    .expect('Content-Type', /json/)
    .expect(500);

  assert.deepEqual(response.body, {
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred.',
    },
  });

  assert.equal(
    JSON.stringify(response.body).includes(
      'Sensitive database connection details',
    ),
    false,
  );
});

test('Explicitly exposed client errors return their safe message', async () => {
  const app = createTestApp((_req, _res, next) => {
    const error = new Error('The submitted data is invalid.');

    error.statusCode = 422;
    error.code = 'VALIDATION_ERROR';
    error.expose = true;

    next(error);
  });

  const response = await request(app)
    .get('/test-error')
    .expect('Content-Type', /json/)
    .expect(422);

  assert.deepEqual(response.body, {
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'The submitted data is invalid.',
    },
  });
});

test('Unknown routes return the standard not-found response', async () => {
  const app = express();

  app.use(notFoundHandler);
  app.use(errorHandler);

  const response = await request(app)
    .get('/unknown-route')
    .expect('Content-Type', /json/)
    .expect(404);

  assert.deepEqual(response.body, {
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found.',
    },
  });
});