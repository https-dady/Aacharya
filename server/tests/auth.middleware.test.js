import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import request from 'supertest';

import { authenticate } from '../src/middleware/auth.middleware.js';
import {
  generateAccessToken,
  generateRefreshToken,
} from '../src/services/auth/token.service.js';
import { errorHandler } from '../src/middleware/error.middleware.js';

function createTestApp() {
  const app = express();

  app.get('/protected', authenticate, (req, res) => {
    res.status(200).json({
      success: true,
      user: req.user,
    });
  });

  app.use(errorHandler);

  return app;
}

const app = createTestApp();
const userId = 'user-123456';

test('allows a request with a valid access token', async () => {
  const token = generateAccessToken(userId);

  const response = await request(app)
    .get('/protected')
    .set('Authorization', `Bearer ${token}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.deepEqual(response.body.user, { id: userId });
});

test('rejects a request without an authorization header', async () => {
  const response = await request(app).get('/protected');

  assert.equal(response.status, 401);
  assert.equal(response.body.success, false);
  assert.equal(response.body.error.code, 'UNAUTHORIZED');
});

test('rejects an invalid access token', async () => {
  const response = await request(app)
    .get('/protected')
    .set('Authorization', 'Bearer invalid.token.value');

  assert.equal(response.status, 401);
  assert.equal(response.body.success, false);
  assert.equal(response.body.error.code, 'INVALID_TOKEN');
});

test('rejects a refresh token used as an access token', async () => {
  const token = generateRefreshToken(userId);

  const response = await request(app)
    .get('/protected')
    .set('Authorization', `Bearer ${token}`);

  assert.equal(response.status, 401);
  assert.equal(response.body.error.code, 'INVALID_TOKEN');
});

test('rejects an unsupported authorization scheme', async () => {
  const token = generateAccessToken(userId);

  const response = await request(app)
    .get('/protected')
    .set('Authorization', `Basic ${token}`);

  assert.equal(response.status, 401);
  assert.equal(response.body.error.code, 'INVALID_TOKEN');
});

test('rejects a malformed bearer authorization header', async () => {
  const response = await request(app)
    .get('/protected')
    .set('Authorization', 'Bearer');

  assert.equal(response.status, 401);
  assert.equal(response.body.error.code, 'INVALID_TOKEN');
});