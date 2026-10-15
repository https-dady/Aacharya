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
import { RefreshSession } from '../../models/refresh-session.model.js';
import { hashPassword } from './password.service.js';

const OTP_LENGTH = 6;
const OTP_TTL_MS =
  env.passwordReset.otpExpiresInMinutes * 60 * 1000;
const RESET_TOKEN_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = env.passwordReset.maxAttempts;

function createResetError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  error.expose = true;
  return error;
}

function invalidOtpError() {
  return createResetError(
    400,
    'INVALID_RESET_OTP',
    'The OTP is invalid or expired.',
  );
}

function invalidResetTokenError() {
  return createResetError(
    400,
    'INVALID_PASSWORD_RESET',
    'The password reset request is invalid or expired.',
  );
}

function hashOtp(otp) {
  return crypto
    .createHmac('sha256', env.passwordReset.otpSecret)
    .update(otp)
    .digest('hex');
}

function hashResetToken(token) {
  return crypto
    .createHmac('sha256', env.passwordReset.otpSecret)
    .update(token)
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

function generateResetToken() {
  return crypto.randomBytes(32).toString('base64url');
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

async function invalidateActiveChallenges(userId, purpose, now) {
  await PasswordResetOtp.updateMany(
    {
      user: userId,
      purpose,
      consumedAt: null,
      invalidatedAt: null,
    },
    {
      $set: { invalidatedAt: now },
    },
  );
}

export async function createPasswordResetChallenge(email) {
  const normalizedEmail = normalizeEmail(email);

  const user = await User.findOne({
    email: normalizedEmail,
    status: ACCOUNT_STATUSES.ACTIVE,
    isEmailVerified: true,
  });

  if (!user) {
    return null;
  }

  const now = new Date();

  await invalidateActiveChallenges(
    user._id,
    OTP_PURPOSES.PASSWORD_RESET,
    now,
  );

  const otp = generateOtp();

  const challenge = await PasswordResetOtp.create({
    user: user._id,
    purpose: OTP_PURPOSES.PASSWORD_RESET,
    targetEmail: normalizedEmail,
    otpHash: hashOtp(otp),
    expiresAt: new Date(now.getTime() + OTP_TTL_MS),
    attempts: 0,
    resendCount: 0,
  });

  return {
    challengeId: challenge.id,
    otp,
    expiresAt: challenge.expiresAt,
    recipientEmail: normalizedEmail,
  };
}

export async function invalidatePasswordResetChallenge(challengeId) {
  if (!isValidChallengeId(challengeId)) {
    return;
  }

  await PasswordResetOtp.updateOne(
    {
      _id: challengeId,
      purpose: OTP_PURPOSES.PASSWORD_RESET,
      verifiedAt: null,
      consumedAt: null,
      invalidatedAt: null,
    },
    {
      $set: { invalidatedAt: new Date() },
    },
  );
}

export async function verifyPasswordResetOtp({ challengeId, otp }) {
  if (
    !isValidChallengeId(challengeId)
    || typeof otp !== 'string'
    || !/^\d{6}$/.test(otp)
  ) {
    throw invalidOtpError();
  }

  const now = new Date();

  const challenge = await PasswordResetOtp.findOne({
    _id: challengeId,
    purpose: OTP_PURPOSES.PASSWORD_RESET,
    verifiedAt: null,
    consumedAt: null,
    invalidatedAt: null,
    expiresAt: { $gt: now },
    attempts: { $lt: MAX_ATTEMPTS },
  }).select('+otpHash');

  if (!challenge) {
    throw invalidOtpError();
  }

  if (!safeCompareHashes(challenge.otpHash, hashOtp(otp))) {
    await PasswordResetOtp.updateOne(
      {
        _id: challenge._id,
        purpose: OTP_PURPOSES.PASSWORD_RESET,
        verifiedAt: null,
        consumedAt: null,
        invalidatedAt: null,
        expiresAt: { $gt: now },
        attempts: { $lt: MAX_ATTEMPTS },
      },
      {
        $inc: { attempts: 1 },
      },
    );

    throw invalidOtpError();
  }

  const resetToken = generateResetToken();
  const resetTokenHash = hashResetToken(resetToken);
  const resetTokenExpiresAt = new Date(
    now.getTime() + RESET_TOKEN_TTL_MS,
  );

  const claimedChallenge = await PasswordResetOtp.findOneAndUpdate(
    {
      _id: challenge._id,
      purpose: OTP_PURPOSES.PASSWORD_RESET,
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
        resetTokenHash,
        resetTokenExpiresAt,
      },
    },
    { new: true },
  );

  if (!claimedChallenge) {
    throw invalidOtpError();
  }

  return {
    resetToken,
    expiresAt: resetTokenExpiresAt,
  };
}

export async function resetPassword({ resetToken, newPassword }) {
  if (
    typeof resetToken !== 'string'
    || resetToken.length < 32
    || typeof newPassword !== 'string'
  ) {
    throw invalidResetTokenError();
  }

  let passwordHash;

  try {
    passwordHash = await hashPassword(newPassword);
  } catch (error) {
    throw createResetError(
      400,
      'INVALID_NEW_PASSWORD',
      error.message,
    );
  }

  const now = new Date();
  const resetTokenHash = hashResetToken(resetToken);

  const challenge = await PasswordResetOtp.findOneAndUpdate(
    {
      purpose: OTP_PURPOSES.PASSWORD_RESET,
      resetTokenHash,
      verifiedAt: { $ne: null },
      resetTokenExpiresAt: { $gt: now },
      consumedAt: null,
      invalidatedAt: null,
    },
    {
      $set: { consumedAt: now },
    },
    { new: false },
  );

  if (!challenge) {
    throw invalidResetTokenError();
  }

  const user = await User.findOneAndUpdate(
    {
      _id: challenge.user,
      status: ACCOUNT_STATUSES.ACTIVE,
    },
    {
      $set: {
        passwordHash,
        passwordChangedAt: now,
      },
      $inc: { tokenVersion: 1 },
    },
    {
      new: true,
      runValidators: true,
    },
  ).select('+tokenVersion');

  if (!user) {
    throw invalidResetTokenError();
  }

  await RefreshSession.updateMany(
    {
      user: user._id,
      revokedAt: null,
    },
    {
      $set: { revokedAt: now },
    },
  );

  return { success: true };
}