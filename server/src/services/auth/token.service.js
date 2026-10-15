import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

import { env } from '../../config/env.js';

const JWT_ISSUER = 'aacharya-lms';
const JWT_AUDIENCE = 'aacharya-lms-client';

function validateUserId(userId) {
  if (typeof userId !== 'string' || !userId.trim()) {
    throw new TypeError('A valid user ID is required.');
  }

  return userId.trim();
}

function createToken(userId, tokenType) {
  const subject = validateUserId(userId);

  const isAccessToken = tokenType === 'access';

  const secret = isAccessToken
    ? env.jwt.accessSecret
    : env.jwt.refreshSecret;

  const expiresIn = isAccessToken
    ? env.jwt.accessExpiresIn
    : env.jwt.refreshExpiresIn;

  if (!secret) {
    throw new Error(
      `JWT ${tokenType} secret is not configured.`,
    );
  }

  return jwt.sign(
    {
      tokenType,
      jti: crypto.randomUUID(),
    },
    secret,
    {
      algorithm: 'HS256',
      subject,
      expiresIn,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    },
  );
}

function verifyToken(token, expectedType) {
  if (typeof token !== 'string' || !token.trim()) {
    throw new TypeError('A valid JWT is required.');
  }

  const isAccessToken = expectedType === 'access';

  const secret = isAccessToken
    ? env.jwt.accessSecret
    : env.jwt.refreshSecret;

  if (!secret) {
    throw new Error(
      `JWT ${expectedType} secret is not configured.`,
    );
  }

  const payload = jwt.verify(token, secret, {
    algorithms: ['HS256'],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });

  if (
    typeof payload === 'string'
    || payload.tokenType !== expectedType
    || typeof payload.sub !== 'string'
    || !payload.sub
    || typeof payload.jti !== 'string'
    || !payload.jti
  ) {
    throw new jwt.JsonWebTokenError(
      `Invalid ${expectedType} token payload.`,
    );
  }

  return {
    userId: payload.sub,
    tokenType: payload.tokenType,
    tokenId: payload.jti,
    issuedAt: payload.iat,
    expiresAt: payload.exp,
  };
}

export function generateAccessToken(userId) {
  return createToken(userId, 'access');
}

export function generateRefreshToken(userId) {
  return createToken(userId, 'refresh');
}

export function verifyAccessToken(token) {
  return verifyToken(token, 'access');
}

export function verifyRefreshToken(token) {
  return verifyToken(token, 'refresh');
}