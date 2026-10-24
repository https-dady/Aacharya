import assert from 'node:assert/strict';
import test from 'node:test';

import express from 'express';
import request from 'supertest';

import studentImportRoutes from '../src/routes/student-import.routes.js';

import {
  errorHandler,
} from '../src/middleware/error.middleware.js';

const VALID_SECTION_ID = '507f1f77bcf86cd799439011';

function createTestApp() {
  const app = express();

  app.use(express.json());

  app.use('/', studentImportRoutes);

  // Match the application's centralized error response format.
  app.use(errorHandler);

  return app;
}

test(
  'student import route rejects unauthenticated requests',
  async () => {
    const app = createTestApp();

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
    assert.equal(response.body.error.code, 'UNAUTHORIZED');
  },
);

test(
  'authentication runs before idempotency-key validation',
  async () => {
    const app = createTestApp();

    const response = await request(app)
      .post(`/sections/${VALID_SECTION_ID}/students/import`)
      .send({
        csvContent: [
          'institutionalId,fullName,password,email',
          'STU001,Test Student,StudentPassword123,test@example.com',
        ].join('\n'),
      });

    assert.equal(response.status, 401);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, 'UNAUTHORIZED');

    assert.notEqual(
      response.body.error.code,
      'INVALID_IDEMPOTENCY_KEY',
    );
  },
);