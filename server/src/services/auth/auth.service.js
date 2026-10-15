import { User, ACCOUNT_STATUSES } from '../../models/user.model.js';

import { comparePassword } from './password.service.js';

import {
  generateAccessToken,
  generateRefreshToken,
} from './token.service.js';

import { createRefreshSession } from './session.service.js';

function createAuthenticationError() {
  const error = new Error('Invalid institutional ID or password.');
  error.statusCode = 401;
  error.code = 'INVALID_CREDENTIALS';
  error.expose = true;

  return error;
}

export async function login(
  { institutionalId, password },
  metadata = {},
) {
  if (
    typeof institutionalId !== 'string'
    || !institutionalId.trim()
    || typeof password !== 'string'
    || !password
  ) {
    throw createAuthenticationError();
  }

  const normalizedInstitutionalId = institutionalId
    .trim()
    .toUpperCase();

  const user = await User.findOne({
    institutionalId: normalizedInstitutionalId,
  }).select('+passwordHash +tokenVersion');

  if (!user) {
    throw createAuthenticationError();
  }

  const passwordMatches = await comparePassword(
    password,
    user.passwordHash,
  );

  if (!passwordMatches) {
    throw createAuthenticationError();
  }

  if (user.status !== ACCOUNT_STATUSES.ACTIVE) {
    const error = new Error(
      'This account is not available for login.',
    );

    error.statusCode = 403;
    error.code = 'ACCOUNT_UNAVAILABLE';
    error.expose = true;

    throw error;
  }

  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  await createRefreshSession(user, refreshToken, metadata);

  user.lastLoginAt = new Date();
  await user.save();

  return {
    user: {
      id: user.id,
      institutionalId: user.institutionalId,
      fullName: user.fullName,
      email: user.email ?? null,
      role: user.role,
      status: user.status,
      department: user.department,
      isEmailVerified: user.isEmailVerified,
      lastLoginAt: user.lastLoginAt,
    },
    tokens: {
      accessToken,
      refreshToken,
    },
  };
}