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

import {
  createPasswordResetChallenge,
  verifyPasswordResetOtp,
} from '../src/services/auth/password-reset.service.js';

afterEach(() => {
  mock.restoreAll();
});

describe('Password reset service', () => {
  it('creates a challenge for an active user with verified email', async () => {
    const user = {
      _id: 'user-123',
      email: 'student@example.com',
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
          id: '507f1f77bcf86cd799439011',
          expiresAt: document.expiresAt,
        };
      },
    );

    const result = await createPasswordResetChallenge(
      ' Student@Example.com ',
    );

    assert.equal(
      result.challengeId,
      '507f1f77bcf86cd799439011',
    );

    assert.equal(
      result.recipientEmail,
      'student@example.com',
    );

    assert.match(result.otp, /^\d{6}$/);

    assert.equal(
      storedChallenge.purpose,
      OTP_PURPOSES.PASSWORD_RESET,
    );

    assert.notEqual(storedChallenge.otpHash, result.otp);

    assert.equal(storedChallenge.attempts, 0);
    assert.equal(storedChallenge.resendCount, 0);

    assert.ok(
      storedChallenge.expiresAt.getTime() > Date.now(),
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

    const result = await createPasswordResetChallenge(
      'unknown@example.com',
    );

    assert.equal(result, null);
    assert.equal(createMock.mock.callCount(), 0);
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
        challengeId: '507f1f77bcf86cd799439011',
        otp: '12AB56',
      }),
      {
        code: 'INVALID_RESET_OTP',
      },
    );
  });

  it('rejects an incorrect OTP and increments the attempt count', async () => {
    const challenge = {
      _id: '507f1f77bcf86cd799439011',
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

        return { acknowledged: true };
      },
    );

    await assert.rejects(
      verifyPasswordResetOtp({
        challengeId: '507f1f77bcf86cd799439011',
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