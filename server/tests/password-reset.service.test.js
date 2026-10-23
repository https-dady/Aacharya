import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';

import { env } from '../src/config/env.js';

import {
  PasswordResetOtp,
  OTP_PURPOSES,
} from '../src/models/password-reset-otp.model.js';

import {
  User,
  ACCOUNT_STATUSES,
} from '../src/models/user.model.js';

import { emailClient } from '../src/services/email/email.service.js';

import {
  createPasswordResetChallenge,
  verifyPasswordResetOtp,
} from '../src/services/auth/password-reset.service.js';

const CHALLENGE_ID = '507f1f77bcf86cd799439011';

afterEach(() => {
  mock.restoreAll();
});

describe('Password reset service', () => {
  it('creates a challenge, stores a hashed OTP and sends the OTP by email', async () => {
    const user = {
      _id: 'user-123',
      email: 'student@example.com',
      fullName: 'Test Student',
      status: ACCOUNT_STATUSES.ACTIVE,
      isEmailVerified: true,
    };

    mock.method(User, 'findOne', async (filter) => {
      assert.equal(filter.email, 'student@example.com');
      assert.equal(filter.status, ACCOUNT_STATUSES.ACTIVE);
      assert.equal(filter.isEmailVerified, true);

      return user;
    });

    mock.method(
      PasswordResetOtp,
      'updateMany',
      async () => ({ acknowledged: true }),
    );

    let storedChallenge;

    mock.method(
      PasswordResetOtp,
      'create',
      async (document) => {
        storedChallenge = document;

        return {
          _id: CHALLENGE_ID,
          id: CHALLENGE_ID,
          expiresAt: document.expiresAt,
        };
      },
    );

    let emailArguments;

    mock.method(
      emailClient,
      'sendTransactionalEmail',
      async (arguments_) => {
        emailArguments = arguments_;

        return {
          messageId: 'test-message-id',
        };
      },
    );

    const result = await createPasswordResetChallenge(
      ' Student@Example.com ',
    );

    assert.equal(result.challengeId, CHALLENGE_ID);

    assert.ok(result.expiresAt instanceof Date);
    assert.ok(result.expiresAt.getTime() > Date.now());

    assert.equal('otp' in result, false);
    assert.equal('recipientEmail' in result, false);

    assert.equal(
      storedChallenge.purpose,
      OTP_PURPOSES.PASSWORD_RESET,
    );

    assert.equal(
      storedChallenge.targetEmail,
      'student@example.com',
    );

    assert.match(storedChallenge.otpHash, /^[a-f\d]{64}$/i);
    assert.equal(storedChallenge.attempts, 0);
    assert.equal(storedChallenge.resendCount, 0);

    assert.equal(emailArguments.to, 'student@example.com');

    assert.equal(
      emailArguments.subject,
      'Reset your Aacharya LMS password',
    );

    assert.match(
      emailArguments.textContent,
      /password reset code is \d{6}/i,
    );

    assert.match(
      emailArguments.htmlContent,
      /Use this code to reset your Aacharya LMS password/i,
    );

    const emailedOtp = emailArguments.textContent.match(
      /password reset code is (\d{6})/i,
    )?.[1];

    assert.ok(
      emailedOtp,
      'The email should contain a six-digit OTP',
    );

    assert.notEqual(
      storedChallenge.otpHash,
      emailedOtp,
      'The stored OTP must not be the plaintext OTP',
    );
  });

  it('does not create a challenge when the user does not exist', async () => {
    mock.method(User, 'findOne', async () => null);

    const createMock = mock.method(
      PasswordResetOtp,
      'create',
      async () => {
        throw new Error('Challenge should not be created');
      },
    );

    const emailMock = mock.method(
      emailClient,
      'sendTransactionalEmail',
      async () => {
        throw new Error('Email should not be sent');
      },
    );

    const result = await createPasswordResetChallenge(
      'unknown@example.com',
    );

    assert.equal(result, null);
    assert.equal(createMock.mock.callCount(), 0);
    assert.equal(emailMock.mock.callCount(), 0);
  });

  it('rejects malformed email input', async () => {
    await assert.rejects(
      createPasswordResetChallenge('   '),
      {
        name: 'TypeError',
        message: 'A valid email address is required.',
      },
    );
  });

  it('invalidates the challenge when email delivery fails', async () => {
    mock.method(
      User,
      'findOne',
      async () => ({
        _id: 'user-123',
        email: 'student@example.com',
        fullName: 'Test Student',
        status: ACCOUNT_STATUSES.ACTIVE,
        isEmailVerified: true,
      }),
    );

    mock.method(
      PasswordResetOtp,
      'updateMany',
      async () => ({ acknowledged: true }),
    );

    mock.method(
      PasswordResetOtp,
      'create',
      async (document) => ({
        _id: CHALLENGE_ID,
        id: CHALLENGE_ID,
        expiresAt: document.expiresAt,
      }),
    );

    mock.method(
      emailClient,
      'sendTransactionalEmail',
      async () => {
        throw new Error('Simulated email delivery failure');
      },
    );

    let invalidationFilter;
    let invalidationUpdate;

    mock.method(
      PasswordResetOtp,
      'updateOne',
      async (filter, update) => {
        invalidationFilter = filter;
        invalidationUpdate = update;

        return {
          acknowledged: true,
          modifiedCount: 1,
        };
      },
    );

    await assert.rejects(
      createPasswordResetChallenge('student@example.com'),
      {
        code: 'PASSWORD_RESET_EMAIL_DELIVERY_FAILED',
        statusCode: 502,
      },
    );

    assert.equal(invalidationFilter._id, CHALLENGE_ID);

    assert.equal(
      invalidationFilter.purpose,
      OTP_PURPOSES.PASSWORD_RESET,
    );

    assert.ok(
      invalidationUpdate.$set.invalidatedAt instanceof Date,
    );
  });

  it('rejects malformed challenge IDs and OTPs', async () => {
    await assert.rejects(
      verifyPasswordResetOtp({
        challengeId: 'invalid-id',
        otp: '123456',
      }),
      {
        code: 'INVALID_RESET_OTP',
      },
    );

    await assert.rejects(
      verifyPasswordResetOtp({
        challengeId: CHALLENGE_ID,
        otp: '12AB56',
      }),
      {
        code: 'INVALID_RESET_OTP',
      },
    );
  });

  it('rejects an incorrect OTP and increments the attempt count', async () => {
    const challenge = {
      _id: CHALLENGE_ID,
      otpHash: 'a'.repeat(64),
    };

    const selectMock = mock.fn(async () => challenge);

    mock.method(
      PasswordResetOtp,
      'findOne',
      () => ({
        select: selectMock,
      }),
    );

    let updateFilter;
    let updateOperation;

    mock.method(
      PasswordResetOtp,
      'updateOne',
      async (filter, update) => {
        updateFilter = filter;
        updateOperation = update;

        return {
          acknowledged: true,
        };
      },
    );

    await assert.rejects(
      verifyPasswordResetOtp({
        challengeId: CHALLENGE_ID,
        otp: '123456',
      }),
      {
        code: 'INVALID_RESET_OTP',
      },
    );

    assert.equal(selectMock.mock.callCount(), 1);
    assert.equal(updateFilter._id, challenge._id);

    assert.equal(
      updateFilter.attempts.$lt,
      env.passwordReset.maxAttempts,
    );

    assert.equal(updateOperation.$inc.attempts, 1);
  });

  it('does not reveal whether an email account exists through the result shape', async () => {
    mock.method(User, 'findOne', async () => null);

    const result = await createPasswordResetChallenge(
      'not-registered@example.com',
    );

    assert.equal(result, null);
  });
});