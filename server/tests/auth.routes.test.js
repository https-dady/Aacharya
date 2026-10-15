process.env.JWT_ACCESS_SECRET = '';
process.env.JWT_REFRESH_SECRET = '';

import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';

import app from '../src/app.js';
import { generateAccessToken } from '../src/services/auth/token.service.js';

const TEST_USER_ID = 'user-123456';

const validAccessToken = generateAccessToken(TEST_USER_ID);

const validAuthorization = `Bearer ${validAccessToken}`;

const VALID_CHALLENGE_ID = '0123456789abcdef01234567';

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