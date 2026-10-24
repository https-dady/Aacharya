import crypto from 'node:crypto';

import { RefreshSession } from '../../models/refresh-session.model.js';

import {
  User,
  ACCOUNT_STATUSES,
} from '../../models/user.model.js';

import {
  generateRefreshToken,
  verifyRefreshToken,
} from './token.service.js';

function hashToken(token) {
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
}

function createSessionError() {
  const error = new Error(
    'The refresh session is invalid or expired.',
  );

  error.statusCode = 401;
  error.code = 'INVALID_REFRESH_SESSION';
  error.expose = true;

  return error;
}

function getTokenExpiry(token) {
  const payload = verifyRefreshToken(token);

  if (!payload.expiresAt) {
    throw createSessionError();
  }

  return new Date(payload.expiresAt * 1000);
}

function normalizeMetadata(metadata = {}) {
  return {
    userAgent:
      typeof metadata.userAgent === 'string'
        ? metadata.userAgent.slice(0, 500)
        : null,

    ipAddress:
      typeof metadata.ipAddress === 'string'
        ? metadata.ipAddress.slice(0, 100)
        : null,
  };
}

function serializeUser(user) {
  return {
    id: user.id,
    institutionalId: user.institutionalId,
    fullName: user.fullName,
    email: user.email ?? null,
    role: user.role,
    status: user.status,
    department: user.department,
    isEmailVerified: user.isEmailVerified,
    lastLoginAt: user.lastLoginAt,
  };
}

async function revokeSessionFamily(familyId) {
  if (!familyId) {
    return;
  }

  await RefreshSession.updateMany(
    {
      familyId,
      revokedAt: null,
    },
    {
      $set: {
        revokedAt: new Date(),
      },
    },
  );
}

export async function createRefreshSession(
  user,
  refreshToken,
  metadata = {},
) {
  if (!user?._id || !refreshToken) {
    throw new TypeError(
      'A user and refresh token are required.',
    );
  }

  let payload;

  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw createSessionError();
  }

  const userId = user._id.toString();
  const tokenVersion = user.tokenVersion ?? 0;

  if (
    payload.userId !== userId
    || payload.tokenVersion !== tokenVersion
  ) {
    throw createSessionError();
  }

  await RefreshSession.create({
    user: user._id,
    familyId: crypto.randomUUID(),
    tokenHash: hashToken(refreshToken),
    expiresAt: getTokenExpiry(refreshToken),
    ...normalizeMetadata(metadata),
  });
}

export async function rotateRefreshSession(
  refreshToken,
  metadata = {},
) {
  let payload;

  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw createSessionError();
  }

  const oldTokenHash = hashToken(refreshToken);
  const now = new Date();

  const existingSession = await RefreshSession.findOne({
    tokenHash: oldTokenHash,
    user: payload.userId,
  }).select('+tokenHash');

  if (!existingSession) {
    throw createSessionError();
  }

  if (existingSession.revokedAt) {
    await revokeSessionFamily(existingSession.familyId);
    throw createSessionError();
  }

  if (existingSession.expiresAt <= now) {
    throw createSessionError();
  }

  const user = await User.findById(payload.userId)
    .select('+tokenVersion');

  if (
    !user
    || user.status !== ACCOUNT_STATUSES.ACTIVE
  ) {
    await revokeSessionFamily(existingSession.familyId);
    throw createSessionError();
  }

  const currentTokenVersion = user.tokenVersion ?? 0;
  const refreshTokenVersion = payload.tokenVersion ?? 0;

  if (refreshTokenVersion !== currentTokenVersion) {
    await revokeSessionFamily(existingSession.familyId);
    throw createSessionError();
  }

  /*
   * Claim the current session atomically so concurrent requests
   * cannot both rotate the same active refresh token.
   */
  const claimedSession = await RefreshSession.findOneAndUpdate(
    {
      _id: existingSession._id,
      revokedAt: null,
      expiresAt: { $gt: now },
    },
    {
      $set: {
        revokedAt: now,
      },
    },
    {
      new: false,
    },
  ).select('+tokenHash');

  if (!claimedSession) {
    await revokeSessionFamily(existingSession.familyId);
    throw createSessionError();
  }

  const newRefreshToken = generateRefreshToken(
    user.id,
    currentTokenVersion,
  );

  const newTokenHash = hashToken(newRefreshToken);
  const newExpiresAt = getTokenExpiry(newRefreshToken);

  try {
    await RefreshSession.create({
      user: user._id,
      familyId: claimedSession.familyId,
      tokenHash: newTokenHash,
      expiresAt: newExpiresAt,
      ...normalizeMetadata(metadata),
    });

    await RefreshSession.updateOne(
      {
        _id: claimedSession._id,
      },
      {
        $set: {
          replacedByTokenHash: newTokenHash,
        },
      },
    );
  } catch (error) {
    await revokeSessionFamily(claimedSession.familyId);
    throw error;
  }

  return {
    userId: user.id,
    tokenVersion: currentTokenVersion,
    user: serializeUser(user),
    refreshToken: newRefreshToken,
  };
}

export async function revokeRefreshSession(refreshToken) {
  if (
    typeof refreshToken !== 'string'
    || !refreshToken.trim()
  ) {
    return;
  }

  let payload;

  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    return;
  }

  await RefreshSession.updateOne(
    {
      tokenHash: hashToken(refreshToken),
      user: payload.userId,
      revokedAt: null,
    },
    {
      $set: {
        revokedAt: new Date(),
      },
    },
  );
}