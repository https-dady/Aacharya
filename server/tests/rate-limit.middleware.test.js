import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import express from 'express';
import request from 'supertest';

import { createApiRateLimiter } from '../src/middleware/rate-limit.middleware.js';

describe('API rate limiter', () => {
  let server;

  afterEach(async () => {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });

      server = undefined;
    }
  });

  function createTestServer() {
    const app = express();

    app.use(
      '/api/v1',
      createApiRateLimiter({
        windowMs: 60_000,
        limit: 2,
      }),
    );

    app.get('/api/v1/test', (_req, res) => {
      res.status(200).json({
        success: true,
        data: {
          message: 'Request successful',
        },
      });
    });

    server = app.listen(0);

    return request(server);
  }

  it('allows requests within the configured limit', async () => {
    const client = createTestServer();

    const firstResponse = await client.get('/api/v1/test');
    const secondResponse = await client.get('/api/v1/test');

    assert.equal(firstResponse.status, 200);
    assert.equal(secondResponse.status, 200);
  });

  it('returns 429 when the request limit is exceeded', async () => {
    const client = createTestServer();

    await client.get('/api/v1/test');
    await client.get('/api/v1/test');

    const response = await client.get('/api/v1/test');

    assert.equal(response.status, 429);
    assert.equal(response.body.success, false);
    assert.equal(
      response.body.error.code,
      'TOO_MANY_REQUESTS',
    );
    assert.equal(
      response.body.error.message,
      'Too many requests. Please try again later.',
    );
  });
});