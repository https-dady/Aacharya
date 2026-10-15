import assert from 'node:assert/strict';
import test from 'node:test';
import jwt from 'jsonwebtoken';

import { env } from '../src/config/env.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '../src/services/auth/token.service.js';

const TEST_USER_ID = 'user-123456';

test('generates and verifies an access token', () => {
  const token = generateAccessToken(TEST_USER_ID);
  const payload = verifyAccessToken(token);

  assert.equal(payload.userId, TEST_USER_ID);
  assert.equal(payload.tokenType, 'access');
  assert.equal(typeof payload.issuedAt, 'number');
  assert.equal(typeof payload.expiresAt, 'number');
  assert.ok(payload.expiresAt > payload.issuedAt);
});

test('generates and verifies a refresh token', () => {
  const token = generateRefreshToken(TEST_USER_ID);
  const payload = verifyRefreshToken(token);

  assert.equal(payload.userId, TEST_USER_ID);
  assert.equal(payload.tokenType, 'refresh');
  assert.ok(payload.expiresAt > payload.issuedAt);
});

test('rejects an access token used as a refresh token', () => {
  const token = generateAccessToken(TEST_USER_ID);

  assert.throws(
    () => verifyRefreshToken(token),
    { name: 'JsonWebTokenError' },
  );
});

test('rejects a refresh token used as an access token', () => {
  const token = generateRefreshToken(TEST_USER_ID);

  assert.throws(
    () => verifyAccessToken(token),
    { name: 'JsonWebTokenError' },
  );
});

test('rejects a token signed with an unexpected secret', () => {
  const token = jwt.sign(
    { tokenType: 'access' },
    'unexpected-test-secret-that-is-not-configured',
    {
      algorithm: 'HS256',
      subject: TEST_USER_ID,
      expiresIn: '15m',
      issuer: 'aacharya-lms',
      audience: 'aacharya-lms-client',
    },
  );

  assert.throws(
    () => verifyAccessToken(token),
    { name: 'JsonWebTokenError' },
  );
});

test('rejects an empty token', () => {
  assert.throws(
    () => verifyAccessToken(''),
    { name: 'TypeError' },
  );
});

test('rejects an invalid user ID when generating a token', () => {
  assert.throws(
    () => generateAccessToken(''),
    { name: 'TypeError' },
  );
});

test('uses separate secrets for access and refresh tokens', () => {
  if (env.jwt.accessSecret && env.jwt.refreshSecret) {
    assert.notEqual(
      env.jwt.accessSecret,
      env.jwt.refreshSecret,
    );
  }
});