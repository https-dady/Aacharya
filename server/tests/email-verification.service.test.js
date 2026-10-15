import assert from 'node:assert/strict';
import crypto from 'node:crypto';
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
  requestEmailVerification,
  verifyEmailAddress,
} from '../src/services/auth/email-verification.service.js';

afterEach(() => {
  mock.restoreAll();
});

const USER_ID = '507f1f77bcf86cd799439011';
const CHALLENGE_ID = '507f1f77bcf86cd799439012';

function createQueryMock(result) {
  return {
    select: mock.fn(async () => result),

    then(resolve, reject) {
      return Promise.resolve(result).then(resolve, reject);
    },
  };
}

function createUser(overrides = {}) {
  return {
    _id: USER_ID,
    id: USER_ID,
    email: 'student@example.com',
    fullName: 'Test Student',
    status: ACCOUNT_STATUSES.ACTIVE,
    isEmailVerified: false,
    emailVerifiedAt: null,
    ...overrides,
  };
}

function hashOtp(otp) {
  return crypto
    .createHmac('sha256', env.passwordReset.otpSecret)
    .update(otp)
    .digest('hex');
}

function createChallenge(otp, overrides = {}) {
  return {
    _id: CHALLENGE_ID,
    id: CHALLENGE_ID,
    user: USER_ID,
    purpose: OTP_PURPOSES.EMAIL_VERIFICATION,
    targetEmail: 'student@example.com',
    otpHash: hashOtp(otp),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    attempts: 0,
    resendCount: 0,
    verifiedAt: null,
    consumedAt: null,
    invalidatedAt: null,
    ...overrides,
  };
}

function mockUserLookup(user) {
  return mock.method(
    User,
    'findOne',
    () => createQueryMock(user),
  );
}

function mockChallengeInvalidation() {
  return mock.method(
    PasswordResetOtp,
    'updateMany',
    async () => ({
      acknowledged: true,
      modifiedCount: 0,
    }),
  );
}

describe('Email verification service', () => {
  it('creates a challenge for an active unverified user', async () => {
    const user = createUser();
    let storedDocument;

    mockUserLookup(user);
    mockChallengeInvalidation();

    mock.method(
      PasswordResetOtp,
      'create',
      async (document) => {
        storedDocument = document;

        return {
          _id: CHALLENGE_ID,
          id: CHALLENGE_ID,
          expiresAt: document.expiresAt,
        };
      },
    );

    const emailMock = mock.method(
      emailClient,
      'sendTransactionalEmail',
      async () => ({ messageId: 'test-message-id' }),
    );

    const result = await requestEmailVerification(USER_ID);

    assert.equal(
      storedDocument.purpose,
      OTP_PURPOSES.EMAIL_VERIFICATION,
    );

    assert.equal(storedDocument.targetEmail, user.email);
    assert.match(storedDocument.otpHash, /^[a-f\d]{64}$/i);
    assert.equal(storedDocument.attempts, 0);
    assert.equal(storedDocument.resendCount, 0);

    assert.ok(
      storedDocument.expiresAt.getTime() > Date.now(),
    );

    assert.equal(emailMock.mock.callCount(), 1);

    assert.equal(
      emailMock.mock.calls[0].arguments[0].to,
      user.email,
    );

    assert.equal(result.challengeId, CHALLENGE_ID);

    assert.equal(
      result.message,
      'Verification code sent to your account email.',
    );
  });

  it('does not issue a new OTP for an already verified user', async () => {
    mockUserLookup(
      createUser({
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
      }),
    );

    const createMock = mock.method(
      PasswordResetOtp,
      'create',
      async () => {
        throw new Error('A challenge should not be created');
      },
    );

    const emailMock = mock.method(
      emailClient,
      'sendTransactionalEmail',
      async () => ({ messageId: 'unexpected' }),
    );

    const result = await requestEmailVerification(USER_ID);

    assert.deepEqual(result, { alreadyVerified: true });
    assert.equal(createMock.mock.callCount(), 0);
    assert.equal(emailMock.mock.callCount(), 0);
  });

  it('rejects verification when the account has no email', async () => {
    mockUserLookup(createUser({ email: undefined }));

    await assert.rejects(
      requestEmailVerification(USER_ID),
      { code: 'EMAIL_VERIFICATION_UNAVAILABLE' },
    );
  });

  it('rejects a malformed challenge ID', async () => {
    await assert.rejects(
      verifyEmailAddress({
        userId: USER_ID,
        challengeId: 'invalid-id',
        otp: '123456',
      }),
      { code: 'INVALID_EMAIL_VERIFICATION' },
    );
  });

  it('rejects an incorrectly formatted OTP', async () => {
    await assert.rejects(
      verifyEmailAddress({
        userId: USER_ID,
        challengeId: CHALLENGE_ID,
        otp: '12AB56',
      }),
      { code: 'INVALID_EMAIL_VERIFICATION' },
    );
  });

  it('rejects an incorrect OTP and increments attempts', async () => {
    const challenge = createChallenge('654321');

    mockUserLookup(createUser());

    mock.method(
      PasswordResetOtp,
      'findOne',
      () => createQueryMock(challenge),
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
          modifiedCount: 1,
        };
      },
    );

    await assert.rejects(
      verifyEmailAddress({
        userId: USER_ID,
        challengeId: CHALLENGE_ID,
        otp: '123456',
      }),
      { code: 'INVALID_EMAIL_VERIFICATION' },
    );

    assert.equal(
      updateFilter.purpose,
      OTP_PURPOSES.EMAIL_VERIFICATION,
    );

    assert.equal(updateOperation.$inc.attempts, 1);

    assert.equal(
      updateFilter.attempts.$lt,
      env.passwordReset.maxAttempts,
    );
  });

  it('rejects a challenge when the email has changed', async () => {
    const user = createUser({
      email: 'new-address@example.com',
    });

    const oldChallenge = createChallenge('123456', {
      targetEmail: 'old-address@example.com',
    });

    mockUserLookup(user);

    let challengeFilter;
    let claimCalled = false;
    let userUpdateCalled = false;

    mock.method(
      PasswordResetOtp,
      'findOne',
      (filter) => {
        challengeFilter = filter;

        // Simulate MongoDB matching the targetEmail filter.
        // An old-email challenge must not match the new email.
        const matchingChallenge =
          filter.targetEmail === oldChallenge.targetEmail
            ? oldChallenge
            : null;

        return createQueryMock(matchingChallenge);
      },
    );

    mock.method(
      PasswordResetOtp,
      'findOneAndUpdate',
      async () => {
        claimCalled = true;
        return oldChallenge;
      },
    );

    mock.method(
      User,
      'findOneAndUpdate',
      async () => {
        userUpdateCalled = true;
        return user;
      },
    );

    await assert.rejects(
      verifyEmailAddress({
        userId: USER_ID,
        challengeId: CHALLENGE_ID,
        otp: '123456',
      }),
      (error) => error.code === 'INVALID_EMAIL_VERIFICATION',
    );

    assert.equal(
      challengeFilter.targetEmail,
      'new-address@example.com',
    );

    assert.equal(
      claimCalled,
      false,
      'An old-email challenge must not be claimed',
    );

    assert.equal(
      userUpdateCalled,
      false,
      'The user must not be updated for an old-email challenge',
    );
  });

  it('invalidates the challenge when email delivery fails', async () => {
    mockUserLookup(createUser());
    mockChallengeInvalidation();

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
      requestEmailVerification(USER_ID),
      {
        code: 'VERIFICATION_EMAIL_DELIVERY_FAILED',
        statusCode: 502,
      },
    );

    assert.equal(invalidationFilter._id, CHALLENGE_ID);

    assert.equal(
      invalidationFilter.purpose,
      OTP_PURPOSES.EMAIL_VERIFICATION,
    );

    assert.ok(
      invalidationUpdate.$set.invalidatedAt instanceof Date,
    );
  });

  it('does not accept a password-reset challenge', async () => {
    mockUserLookup(createUser());

    let challengeFilter;

    mock.method(
      PasswordResetOtp,
      'findOne',
      (filter) => {
        challengeFilter = filter;
        return createQueryMock(null);
      },
    );

    await assert.rejects(
      verifyEmailAddress({
        userId: USER_ID,
        challengeId: CHALLENGE_ID,
        otp: '123456',
      }),
      { code: 'INVALID_EMAIL_VERIFICATION' },
    );

    assert.equal(
      challengeFilter.purpose,
      OTP_PURPOSES.EMAIL_VERIFICATION,
    );
  });

  it('marks the email verified after a valid OTP is claimed', async () => {
    const user = createUser();
    const challenge = createChallenge('123456');

    mockUserLookup(user);

    mock.method(
      PasswordResetOtp,
      'findOne',
      () => createQueryMock(challenge),
    );

    let claimFilter;
    let claimUpdate;

    mock.method(
      PasswordResetOtp,
      'findOneAndUpdate',
      async (filter, update) => {
        claimFilter = filter;
        claimUpdate = update;

        return {
          ...challenge,
          verifiedAt: update.$set.verifiedAt,
          consumedAt: update.$set.consumedAt,
        };
      },
    );

    let userUpdateFilter;
    let userUpdateOperation;

    mock.method(
      User,
      'findOneAndUpdate',
      async (filter, update) => {
        userUpdateFilter = filter;
        userUpdateOperation = update;

        return {
          ...user,
          isEmailVerified: true,
          emailVerifiedAt: update.$set.emailVerifiedAt,
        };
      },
    );

    const result = await verifyEmailAddress({
      userId: USER_ID,
      challengeId: CHALLENGE_ID,
      otp: '123456',
    });

    assert.equal(
      claimFilter.purpose,
      OTP_PURPOSES.EMAIL_VERIFICATION,
    );

    assert.ok(claimUpdate.$set.verifiedAt instanceof Date);
    assert.ok(claimUpdate.$set.consumedAt instanceof Date);

    assert.equal(userUpdateFilter.email, user.email);
    assert.equal(userUpdateFilter.isEmailVerified, false);

    assert.equal(
      userUpdateOperation.$set.isEmailVerified,
      true,
    );

    assert.ok(
      userUpdateOperation.$set.emailVerifiedAt instanceof Date,
    );

    assert.deepEqual(result, {
      success: true,
      message: 'Email verified successfully.',
    });
  });
});