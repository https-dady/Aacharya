import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';

import express from 'express';
import request from 'supertest';

import studentImportRoutes from '../src/routes/student-import.routes.js';

import {
  generateAccessToken,
} from '../src/services/auth/token.service.js';

import {
  authRateLimiter,
} from '../src/middleware/rate-limit.middleware.js';

const TEST_USER_ID = 'user-123456';

const ACCESS_TOKEN = generateAccessToken(TEST_USER_ID);

const AUTHORIZATION = `Bearer ${ACCESS_TOKEN}`;

const VALID_SECTION_ID = '507f1f77bcf86cd799439011';

function createTestApp() {
  const app = express();

  app.use(express.json());

  app.use('/', studentImportRoutes);

  return app;
}

const app = createTestApp();

beforeEach(() => {
  authRateLimiter.resetKey('127.0.0.1');
  authRateLimiter.resetKey('::ffff:127.0.0.1');
});

test(
  'student import route rejects a missing Idempotency-Key',
  async () => {
    const response = await request(app)
      .post(`/sections/${VALID_SECTION_ID}/students/import`)
      .set('Authorization', AUTHORIZATION)
      .send({
        csvContent: [
          'institutionalId,fullName,password,email',
          'STU001,Test Student,StudentPassword123,test@example.com',
        ].join('\n'),
      });

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
    assert.equal(
      response.body.code,
      'INVALID_IDEMPOTENCY_KEY',
    );
  },
);

test(
  'student import route rejects a malformed Idempotency-Key',
  async () => {
    const response = await request(app)
      .post(`/sections/${VALID_SECTION_ID}/students/import`)
      .set('Authorization', AUTHORIZATION)
      .set('Idempotency-Key', 'invalid key!')
      .send({
        csvContent: [
          'institutionalId,fullName,password,email',
          'STU001,Test Student,StudentPassword123,test@example.com',
        ].join('\n'),
      });

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
    assert.equal(
      response.body.code,
      'INVALID_IDEMPOTENCY_KEY',
    );
  },
);

test(
  'student import route requires authentication before processing the import',
  async () => {
    const response = await request(app)
      .post(`/sections/${VALID_SECTION_ID}/students/import`)
      .set('Idempotency-Key', 'student-import-test-001')
      .send({
        csvContent: [
          'institutionalId,fullName,password,email',
          'STU001,Test Student,StudentPassword123,test@example.com',
        ].join('\n'),
      });

    assert.equal(response.status, 401);
    assert.equal(response.body.success, false);
  },
);