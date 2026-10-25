import assert from 'node:assert/strict';
import test from 'node:test';

import { requireTrustedOrigin } from '../src/middleware/csrf.middleware.js';
import { env } from '../src/config/env.js';

function invoke(origin) {
  const req = {
    get(name) {
      return name.toLowerCase() === 'origin' ? origin : undefined;
    },
  };
  let forwardedError = null;
  let nextCalled = false;

  requireTrustedOrigin(req, {}, (error) => {
    forwardedError = error ?? null;
    nextCalled = !error;
  });

  return { forwardedError, nextCalled };
}

test('allows the configured frontend origin', () => {
  const result = invoke(env.clientUrl);
  assert.equal(result.forwardedError, null);
  assert.equal(result.nextCalled, true);
});

test('rejects an untrusted origin', () => {
  const result = invoke('https://attacker.example');
  assert.equal(result.nextCalled, false);
  assert.equal(result.forwardedError?.statusCode, 403);
  assert.equal(result.forwardedError?.code, 'CSRF_ORIGIN_REJECTED');
});

test('rejects malformed origin values', () => {
  const result = invoke('not-a-valid-origin');
  assert.equal(result.nextCalled, false);
  assert.equal(result.forwardedError?.code, 'CSRF_ORIGIN_REJECTED');
});
