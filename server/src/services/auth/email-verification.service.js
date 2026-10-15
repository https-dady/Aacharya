import crypto from 'node:crypto';

import { env } from '../../config/env.js';
import {
  PasswordResetOtp,
  OTP_PURPOSES,
} from '../../models/password-reset-otp.model.js';
import {
  User,
  ACCOUNT_STATUSES,
} from '../../models/user.model.js';
import { emailClient } from '../email/email.service.js';

const OTP_LENGTH = 6;
const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = env.passwordReset.maxAttempts;

function createVerificationError(statusCode, code, message) {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.code = code;
  error.expose = true;

  return error;
}

function invalidChallengeError() {
  return createVerificationError(
    400,
    'INVALID_EMAIL_VERIFICATION',
    'The verification request is invalid or expired.',
  );
}

function hashOtp(otp) {
  return crypto
    .createHmac('sha256', env.passwordReset.otpSecret)
    .update(otp)
    .digest('hex');
}

function safeCompareHashes(firstHash, secondHash) {
  if (
    typeof firstHash !== 'string'
    || typeof secondHash !== 'string'
    || !/^[a-f\d]{64}$/i.test(firstHash)
    || !/^[a-f\d]{64}$/i.test(secondHash)
  ) {
    return false;
  }

  const first = Buffer.from(firstHash, 'hex');
  const second = Buffer.from(secondHash, 'hex');

  return crypto.timingSafeEqual(first, second);
}

function generateOtp() {
  return crypto
    .randomInt(0, 10 ** OTP_LENGTH)
    .toString()
    .padStart(OTP_LENGTH, '0');
}

function normalizeEmail(email) {
  if (
    typeof email !== 'string'
    || !email.trim()
    || email.length > 254
  ) {
    throw new TypeError('A valid email address is required.');
  }

  return email.trim().toLowerCase();
}

function isValidChallengeId(challengeId) {
  return (
    typeof challengeId === 'string'
    && /^[a-f\d]{24}$/i.test(challengeId)
  );
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

async function invalidateChallenges(userId, now) {
  await PasswordResetOtp.updateMany(
    {
      user: userId,
      purpose: OTP_PURPOSES.EMAIL_VERIFICATION,
      consumedAt: null,
      invalidatedAt: null,
    },
    {
      $set: {
        invalidatedAt: now,
      },
    },
  );
}

async function sendVerificationOtp(email, otp, fullName) {
  const displayName = fullName || 'Student';
  const safeName = escapeHtml(displayName);

  await emailClient.sendTransactionalEmail({
    to: email,
    subject: 'Verify your Aacharya LMS email',
    textContent:
      `Hello ${displayName},\n\n`
      + `Your Aacharya LMS email verification code is ${otp}.\n`
      + 'It expires in 10 minutes. Do not share this code with anyone.',
    htmlContent: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#1D1F27">
        <h2>Verify your email</h2>
        <p>Hello ${safeName},</p>
        <p>Use this code to verify your Aacharya LMS email address:</p>
        <div style="font-size:32px;font-weight:bold;letter-spacing:8px;padding:18px 0">${otp}</div>
        <p>This code expires in <strong>10 minutes</strong>.</p>
        <p>If you did not request this code, you can ignore this email.</p>
      </div>
    `,
  });
}

/**
 * Issue a verification challenge for the authenticated account.
 */
export async function requestEmailVerification(userId) {
  const user = await User.findOne({
    _id: userId,
    status: ACCOUNT_STATUSES.ACTIVE,
  }).select('+tokenVersion');

  if (!user || !user.email) {
    throw createVerificationError(
      404,
      'EMAIL_VERIFICATION_UNAVAILABLE',
      'Email verification is unavailable for this account.',
    );
  }

  if (user.isEmailVerified) {
    return { alreadyVerified: true };
  }

  const email = normalizeEmail(user.email);
  const now = new Date();

  await invalidateChallenges(user._id, now);

  const otp = generateOtp();

  const challenge = await PasswordResetOtp.create({
    user: user._id,
    purpose: OTP_PURPOSES.EMAIL_VERIFICATION,
    targetEmail: email,
    otpHash: hashOtp(otp),
    expiresAt: new Date(now.getTime() + OTP_TTL_MS),
    attempts: 0,
    resendCount: 0,
  });

  try {
    await sendVerificationOtp(email, otp, user.fullName);
  } catch {
    await PasswordResetOtp.updateOne(
      {
        _id: challenge._id,
        purpose: OTP_PURPOSES.EMAIL_VERIFICATION,
        consumedAt: null,
        invalidatedAt: null,
      },
      {
        $set: {
          invalidatedAt: new Date(),
        },
      },
    );

    throw createVerificationError(
      502,
      'VERIFICATION_EMAIL_DELIVERY_FAILED',
      'The verification email could not be sent. Please try again later.',
    );
  }

  return {
    challengeId: challenge.id,
    expiresAt: challenge.expiresAt,
    message: 'Verification code sent to your account email.',
  };
}

/**
 * Verify the OTP against the account's current email address.
 */
export async function verifyEmailAddress({
  userId,
  challengeId,
  otp,
}) {
  if (
    !userId
    || !isValidChallengeId(challengeId)
    || typeof otp !== 'string'
    || !/^\d{6}$/.test(otp)
  ) {
    throw invalidChallengeError();
  }

  const user = await User.findOne({
    _id: userId,
    status: ACCOUNT_STATUSES.ACTIVE,
  });

  if (!user || !user.email) {
    throw invalidChallengeError();
  }

  if (user.isEmailVerified) {
    return { alreadyVerified: true };
  }

  const currentEmail = normalizeEmail(user.email);
  const now = new Date();

  const challenge = await PasswordResetOtp.findOne({
    _id: challengeId,
    user: user._id,
    purpose: OTP_PURPOSES.EMAIL_VERIFICATION,
    targetEmail: currentEmail,
    verifiedAt: null,
    consumedAt: null,
    invalidatedAt: null,
    expiresAt: { $gt: now },
    attempts: { $lt: MAX_ATTEMPTS },
  }).select('+otpHash');

  if (!challenge) {
    throw invalidChallengeError();
  }

  if (!safeCompareHashes(challenge.otpHash, hashOtp(otp))) {
    await PasswordResetOtp.updateOne(
      {
        _id: challenge._id,
        user: user._id,
        purpose: OTP_PURPOSES.EMAIL_VERIFICATION,
        targetEmail: currentEmail,
        verifiedAt: null,
        consumedAt: null,
        invalidatedAt: null,
        expiresAt: { $gt: now },
        attempts: { $lt: MAX_ATTEMPTS },
      },
      {
        $inc: {
          attempts: 1,
        },
      },
    );

    throw invalidChallengeError();
  }

  /*
   * Atomically claim the challenge.
   * A concurrent request cannot claim the same active challenge twice.
   */
  const claimedChallenge = await PasswordResetOtp.findOneAndUpdate(
    {
      _id: challenge._id,
      user: user._id,
      purpose: OTP_PURPOSES.EMAIL_VERIFICATION,
      targetEmail: currentEmail,
      otpHash: challenge.otpHash,
      verifiedAt: null,
      consumedAt: null,
      invalidatedAt: null,
      expiresAt: { $gt: now },
      attempts: { $lt: MAX_ATTEMPTS },
    },
    {
      $set: {
        verifiedAt: now,
        consumedAt: now,
      },
    },
    {
      new: true,
    },
  );

  if (!claimedChallenge) {
    throw invalidChallengeError();
  }

  /*
   * Only verify the email if the account still has the same address.
   */
  const updatedUser = await User.findOneAndUpdate(
    {
      _id: user._id,
      email: currentEmail,
      isEmailVerified: false,
      status: ACCOUNT_STATUSES.ACTIVE,
    },
    {
      $set: {
        isEmailVerified: true,
        emailVerifiedAt: now,
      },
    },
    {
      new: true,
      runValidators: true,
    },
  );

  if (!updatedUser) {
    throw invalidChallengeError();
  }

  return {
    success: true,
    message: 'Email verified successfully.',
  };
}