import assert from 'node:assert/strict';
import test from 'node:test';

import express from 'express';
import request from 'supertest';

import studentImportRoutes from '../src/routes/student-import.routes.js';

const VALID_SECTION_ID = '507f1f77bcf86cd799439011';

function createTestApp() {
  const app = express();

  app.use(express.json());

  app.use('/', studentImportRoutes);

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
  },
);

test(
  'student import route checks authentication before idempotency validation',
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

    assert.notEqual(
      response.body.code,
      'INVALID_IDEMPOTENCY_KEY',
    );
  },
);