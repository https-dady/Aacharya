import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import request from 'supertest';

import { authorize } from '../src/middleware/authorize.middleware.js';
import { errorHandler } from '../src/middleware/error.middleware.js';

function createTestApp(user) {
  const app = express();

  app.get(
    '/protected',
    (req, res, next) => {
      if (user) {
        req.user = user;
      }

      next();
    },
    authorize('HOD', 'SUPER_ADMIN'),
    (req, res) => {
      res.status(200).json({
        success: true,
      });
    },
  );

  app.use(errorHandler);

  return app;
}

test('allows a user with an authorized role', async () => {
  const app = createTestApp({
    id: 'user-1',
    role: 'HOD',
  });

  const response = await request(app).get('/protected');

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
});

test('allows an authorized role in the roles array', async () => {
  const app = createTestApp({
    id: 'user-2',
    roles: ['STUDENT', 'SUPER_ADMIN'],
  });

  const response = await request(app).get('/protected');

  assert.equal(response.status, 200);
});

test('rejects a user without the required role', async () => {
  const app = createTestApp({
    id: 'user-3',
    role: 'STUDENT',
  });

  const response = await request(app).get('/protected');

  assert.equal(response.status, 403);
  assert.equal(response.body.success, false);
  assert.equal(response.body.error.code, 'FORBIDDEN');
});

test('rejects a request without an authenticated user', async () => {
  const app = createTestApp(null);

  const response = await request(app).get('/protected');

  assert.equal(response.status, 401);
  assert.equal(response.body.error.code, 'UNAUTHORIZED');
});

test('rejects invalid roles when configuring the middleware', () => {
  assert.throws(
    () => authorize('INVALID_ROLE'),
    { name: 'TypeError' },
  );
});

test('rejects an empty allowed-role list', () => {
  assert.throws(
    () => authorize(),
    { name: 'TypeError' },
  );
});