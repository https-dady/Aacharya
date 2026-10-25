import test from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';

import { validate } from '../src/middleware/validate.middleware.js';

function runMiddleware(middleware, req) {
  return new Promise((resolve) => {
    middleware(req, {}, (error) => resolve(error ?? null));
  });
}

test('rejects a non-Zod-compatible schema at configuration time', () => {
  assert.throws(
    () => validate({}),
    /Zod-compatible schema/,
  );
});

test('stores parsed body, params and transformed query in req.validated', async () => {
  const schema = z.object({
    body: z.object({ name: z.string().trim() }),
    params: z.object({ id: z.string() }),
    query: z.object({ page: z.string().transform(Number) }),
  });
  const req = {
    body: { name: '  Tarun  ' },
    params: { id: 'abc' },
    query: { page: '2' },
  };

  const error = await runMiddleware(validate(schema), req);

  assert.equal(error, null);
  assert.equal(req.validated.body.name, 'Tarun');
  assert.equal(req.validated.params.id, 'abc');
  assert.equal(req.validated.query.page, 2);
  assert.equal(req.body.name, 'Tarun');
  assert.equal(Object.isFrozen(req.validated), true);
  assert.equal(req.query.page, '2');
});

test('forwards structured validation errors to centralized handling', async () => {
  const schema = z.object({
    body: z.object({ name: z.string().min(1) }),
    params: z.object({}),
    query: z.object({}),
  });
  const req = { body: { name: '' }, params: {}, query: {} };

  const error = await runMiddleware(validate(schema), req);

  assert.ok(error instanceof Error);
  assert.equal(error.statusCode, 422);
  assert.equal(error.code, 'VALIDATION_ERROR');
  assert.equal(error.expose, true);
  assert.ok(Array.isArray(error.details));
  assert.equal(error.details[0].path, 'body.name');
});
