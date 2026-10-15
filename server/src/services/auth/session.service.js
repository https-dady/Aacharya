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
  return crypto.createHash('sha256').update(token).digest('hex');
}

function createSessionError() {
  const error = new Error('The refresh session is invalid or expired.');

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

/**
 * Creates a refresh session.
 * Only the SHA-256 hash of the refresh token is stored.
 */
export async function createRefreshSession(
  user,
  refreshToken,
  metadata = {},
) {
  if (!user?._id || !refreshToken) {
    throw new TypeError('A user and refresh token are required.');
  }

  const tokenHash = hashToken(refreshToken);
  const expiresAt = getTokenExpiry(refreshToken);
  const familyId = crypto.randomUUID();

  await RefreshSession.create({
    user: user._id,
    familyId,
    tokenHash,
    expiresAt,
    ...normalizeMetadata(metadata),
  });
}

/**
 * Rotates a refresh token and preserves its session family.
 */
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

  // Reuse of a revoked token invalidates active sessions in its family.
  if (existingSession.revokedAt) {
    if (existingSession.familyId) {
      await RefreshSession.updateMany(
        {
          familyId: existingSession.familyId,
          revokedAt: null,
        },
        {
          $set: { revokedAt: now },
        },
      );
    }

    throw createSessionError();
  }

  if (existingSession.expiresAt <= now) {
    throw createSessionError();
  }

  const user = await User.findById(payload.userId);

  if (!user || user.status !== ACCOUNT_STATUSES.ACTIVE) {
    if (existingSession.familyId) {
      await RefreshSession.updateMany(
        {
          familyId: existingSession.familyId,
          revokedAt: null,
        },
        {
          $set: { revokedAt: now },
        },
      );
    }

    throw createSessionError();
  }

  // Atomically claim the active session to prevent normal concurrent reuse.
  const claimedSession = await RefreshSession.findOneAndUpdate(
    {
      _id: existingSession._id,
      revokedAt: null,
      expiresAt: { $gt: now },
    },
    {
      $set: { revokedAt: now },
    },
    {
      new: false,
    },
  ).select('+tokenHash');

  if (!claimedSession) {
    if (existingSession.familyId) {
      await RefreshSession.updateMany(
        {
          familyId: existingSession.familyId,
          revokedAt: null,
        },
        {
          $set: { revokedAt: new Date() },
        },
      );
    }

    throw createSessionError();
  }

  const newRefreshToken = generateRefreshToken(user.id);
  const newTokenHash = hashToken(newRefreshToken);
  const newExpiresAt = getTokenExpiry(newRefreshToken);

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

  return {
    userId: user.id,
    refreshToken: newRefreshToken,
  };
}

/**
 * Revokes the supplied refresh session during logout.
 * Invalid refresh tokens are ignored.
 */
export async function revokeRefreshSession(refreshToken) {
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