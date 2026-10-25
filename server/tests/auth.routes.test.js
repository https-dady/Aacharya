process.env.JWT_ACCESS_SECRET = '';
process.env.JWT_REFRESH_SECRET = '';

import assert from 'node:assert/strict';
import test, { afterEach, beforeEach, mock } from 'node:test';

import request from 'supertest';

import app from '../src/app.js';

import { generateAccessToken } from '../src/services/auth/token.service.js';

import { authRateLimiter } from '../src/middleware/rate-limit.middleware.js';

import {
  User,
  ACCOUNT_STATUSES,
} from '../src/models/user.model.js';

const TEST_USER_ID = 'user-123456';

const validAccessToken = generateAccessToken(TEST_USER_ID);
const validAuthorization = `Bearer ${validAccessToken}`;

const VALID_CHALLENGE_ID = '0123456789abcdef01234567';

function createMockQuery(result) {
  return {
    select() {
      return this;
    },

    lean() {
      return this;
    },

    exec() {
      return Promise.resolve(result);
    },

    then(resolve, reject) {
      return Promise.resolve(result).then(resolve, reject);
    },
  };
}

/*
 * Reset only the in-memory authentication rate-limit counter
 * used by the local Supertest client.
 *
 * Mock the authenticated user's database lookup so these tests
 * do not require a real database connection.
 *
 * Production rate-limit settings remain unchanged.
 */
beforeEach(() => {
  authRateLimiter.resetKey('127.0.0.1');
  authRateLimiter.resetKey('::ffff:127.0.0.1');

  mock.method(User, 'findById', () =>
    createMockQuery({
      _id: TEST_USER_ID,
      status: ACCOUNT_STATUSES.ACTIVE,
      tokenVersion: 0,
    }),
  );
});

afterEach(() => {
  mock.restoreAll();
});

/*
 * Email verification authentication and validation
 */

test('email verification request rejects a missing access token', async () => {
  const response = await request(app)
    .post('/api/v1/auth/email/verification/request')
    .send({})
    .expect('Content-Type', /json/)
    .expect(401);

  assert.equal(response.body.success, false);
  assert.equal(response.body.error.code, 'UNAUTHORIZED');
});

test('email verification confirmation rejects a missing access token', async () => {
  const response = await request(app)
    .post('/api/v1/auth/email/verification/confirm')
    .send({
      challengeId: VALID_CHALLENGE_ID,
      otp: '123456',
    })
    .expect('Content-Type', /json/)
    .expect(401);

  assert.equal(response.body.success, false);
  assert.equal(response.body.error.code, 'UNAUTHORIZED');
});

test('email verification confirmation rejects malformed challenge IDs without a token', async () => {
  const response = await request(app)
    .post('/api/v1/auth/email/verification/confirm')
    .send({
      challengeId: 'invalid-id',
      otp: '123456',
    })
    .expect('Content-Type', /json/)
    .expect(401);

  assert.equal(response.body.success, false);
  assert.equal(response.body.error.code, 'UNAUTHORIZED');
});

test('email verification confirmation rejects malformed OTPs without a token', async () => {
  const response = await request(app)
    .post('/api/v1/auth/email/verification/confirm')
    .send({
      challengeId: VALID_CHALLENGE_ID,
      otp: '12345',
    })
    .expect('Content-Type', /json/)
    .expect(401);

  assert.equal(response.body.success, false);
  assert.equal(response.body.error.code, 'UNAUTHORIZED');
});

test('email verification request rejects an unexpected body field', async () => {
  const response = await request(app)
    .post('/api/v1/auth/email/verification/request')
    .set('Authorization', validAuthorization)
    .send({
      unexpected: true,
    })
    .expect('Content-Type', /json/)
    .expect(422);

  assert.equal(response.body.success, false);
});

test('email verification confirmation rejects a malformed challenge ID', async () => {
  const response = await request(app)
    .post('/api/v1/auth/email/verification/confirm')
    .set('Authorization', validAuthorization)
    .send({
      challengeId: 'invalid-id',
      otp: '123456',
    })
    .expect('Content-Type', /json/)
    .expect(422);

  assert.equal(response.body.success, false);
});

test('email verification confirmation rejects an OTP with fewer than six digits', async () => {
  const response = await request(app)
    .post('/api/v1/auth/email/verification/confirm')
    .set('Authorization', validAuthorization)
    .send({
      challengeId: VALID_CHALLENGE_ID,
      otp: '12345',
    })
    .expect('Content-Type', /json/)
    .expect(422);

  assert.equal(response.body.success, false);
});

test('email verification confirmation rejects an OTP containing non-numeric characters', async () => {
  const response = await request(app)
    .post('/api/v1/auth/email/verification/confirm')
    .set('Authorization', validAuthorization)
    .send({
      challengeId: VALID_CHALLENGE_ID,
      otp: '12ab56',
    })
    .expect('Content-Type', /json/)
    .expect(422);

  assert.equal(response.body.success, false);
});

test('email verification confirmation rejects unexpected body fields', async () => {
  const response = await request(app)
    .post('/api/v1/auth/email/verification/confirm')
    .set('Authorization', validAuthorization)
    .send({
      challengeId: VALID_CHALLENGE_ID,
      otp: '123456',
      unexpected: true,
    })
    .expect('Content-Type', /json/)
    .expect(422);

  assert.equal(response.body.success, false);
});

/*
 * Password-reset request validation
 */

test('password reset request rejects a malformed email', async () => {
  const response = await request(app)
    .post('/api/v1/auth/password/reset/request')
    .send({
      email: 'not-an-email',
    })
    .expect('Content-Type', /json/)
    .expect(422);

  assert.equal(response.body.success, false);
  assert.equal(response.body.error.code, 'VALIDATION_ERROR');
});

test('password reset request rejects an empty body', async () => {
  const response = await request(app)
    .post('/api/v1/auth/password/reset/request')
    .send({})
    .expect('Content-Type', /json/)
    .expect(422);

  assert.equal(response.body.success, false);
});

test('password reset request rejects unexpected body fields', async () => {
  const response = await request(app)
    .post('/api/v1/auth/password/reset/request')
    .send({
      email: 'student@example.com',
      institutionalId: 'ADMIN001',
    })
    .expect('Content-Type', /json/)
    .expect(422);

  assert.equal(response.body.success, false);
});

/*
 * Password-reset OTP verification validation
 */

test('password reset verification rejects a malformed challenge ID', async () => {
  const response = await request(app)
    .post('/api/v1/auth/password/reset/verify')
    .send({
      challengeId: 'invalid-id',
      otp: '123456',
    })
    .expect('Content-Type', /json/)
    .expect(422);

  assert.equal(response.body.success, false);
});

test('password reset verification rejects an OTP with fewer than six digits', async () => {
  const response = await request(app)
    .post('/api/v1/auth/password/reset/verify')
    .send({
      challengeId: VALID_CHALLENGE_ID,
      otp: '12345',
    })
    .expect('Content-Type', /json/)
    .expect(422);

  assert.equal(response.body.success, false);
});

test('password reset verification rejects non-numeric OTPs', async () => {
  const response = await request(app)
    .post('/api/v1/auth/password/reset/verify')
    .send({
      challengeId: VALID_CHALLENGE_ID,
      otp: '12ab56',
    })
    .expect('Content-Type', /json/)
    .expect(422);

  assert.equal(response.body.success, false);
});

test('password reset verification rejects unexpected body fields', async () => {
  const response = await request(app)
    .post('/api/v1/auth/password/reset/verify')
    .send({
      challengeId: VALID_CHALLENGE_ID,
      otp: '123456',
      extra: true,
    })
    .expect('Content-Type', /json/)
    .expect(422);

  assert.equal(response.body.success, false);
});

/*
 * Password-reset confirmation validation
 */

test('password reset confirmation rejects a missing reset token', async () => {
  const response = await request(app)
    .post('/api/v1/auth/password/reset/confirm')
    .send({
      newPassword: 'SecurePassword123!',
    })
    .expect('Content-Type', /json/)
    .expect(422);

  assert.equal(response.body.success, false);
});

test('password reset confirmation rejects a short reset token', async () => {
  const response = await request(app)
    .post('/api/v1/auth/password/reset/confirm')
    .send({
      resetToken: 'short-token',
      newPassword: 'SecurePassword123!',
    })
    .expect('Content-Type', /json/)
    .expect(422);

  assert.equal(response.body.success, false);
});

test('password reset confirmation rejects a password shorter than eight characters', async () => {
  const response = await request(app)
    .post('/api/v1/auth/password/reset/confirm')
    .send({
      resetToken: 'a'.repeat(43),
      newPassword: 'short',
    })
    .expect('Content-Type', /json/)
    .expect(422);

  assert.equal(response.body.success, false);
});

test('password reset confirmation rejects unexpected body fields', async () => {
  const response = await request(app)
    .post('/api/v1/auth/password/reset/confirm')
    .send({
      resetToken: 'a'.repeat(43),
      newPassword: 'SecurePassword123!',
      userId: 'user-123456',
    })
    .expect('Content-Type', /json/)
    .expect(422);

  assert.equal(response.body.success, false);
});