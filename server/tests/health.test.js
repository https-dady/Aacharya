process.env.JWT_ACCESS_SECRET = '';
process.env.JWT_REFRESH_SECRET = '';

import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';

import app from '../src/app.js';

test('GET /health/live returns alive status', async () => {
  const response = await request(app)
    .get('/health/live')
    .expect('Content-Type', /json/)
    .expect(200);

  assert.deepEqual(response.body, {
    success: true,
    data: {
      status: 'alive',
    },
  });
});

test('GET /health/ready returns 503 when database is disconnected', async () => {
  const response = await request(app)
    .get('/health/ready')
    .expect('Content-Type', /json/)
    .expect(503);

  assert.deepEqual(response.body, {
    success: false,
    data: {
      status: 'not_ready',
      checks: {
        application: 'ok',
        database: 'disconnected',
      },
    },
  });
});

test('GET /api/v1/meta returns API metadata', async () => {
  const response = await request(app)
    .get('/api/v1/meta')
    .expect('Content-Type', /json/)
    .expect(200);

  assert.equal(response.body.success, true);
  assert.equal(response.body.data.name, 'Aacharya LMS API');
  assert.equal(response.body.data.version, '1.0.0');
  assert.equal(typeof response.body.data.environment, 'string');
});

test('Unknown routes return a consistent 404 response', async () => {
  const response = await request(app)
    .get('/this-route-does-not-exist')
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