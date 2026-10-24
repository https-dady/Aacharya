import crypto from 'node:crypto';

import { env } from '../config/env.js';

import { login } from '../services/auth/auth.service.js';

import {
  rotateRefreshSession,
  revokeRefreshSession,
} from '../services/auth/session.service.js';

import { generateAccessToken } from '../services/auth/token.service.js';

import {
  requestEmailVerification,
  verifyEmailAddress,
} from '../services/auth/email-verification.service.js';

import {
  createPasswordResetChallenge,
  verifyPasswordResetOtp,
  resetPassword,
} from '../services/auth/password-reset.service.js';

const REFRESH_COOKIE_NAME = 'aacharya_refresh_token';

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/api/v1/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

function createAuthenticationError(statusCode, code, message) {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.code = code;
  error.expose = true;

  return error;
}

function sendPasswordResetRequestResponse(res, challenge) {
  const expiresAt = challenge?.expiresAt
    ?? new Date(
      Date.now()
        + env.passwordReset.otpExpiresInMinutes * 60 * 1000,
    );

  const challengeId = challenge?.challengeId
    ?? crypto.randomBytes(12).toString('hex');

  return res.status(200).json({
    success: true,
    data: {
      challengeId,
      expiresAt,
      message:
        'If an eligible account exists for this email, '
        + 'a password reset code has been sent.',
    },
  });
}

export async function loginController(req, res, next) {
  try {
    const result = await login(
      {
        institutionalId: req.body.institutionalId,
        password: req.body.password,
      },
      {
        userAgent: req.get('user-agent'),
        ipAddress: req.ip,
      },
    );

    res.cookie(
      REFRESH_COOKIE_NAME,
      result.tokens.refreshToken,
      REFRESH_COOKIE_OPTIONS,
    );

    return res.status(200).json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.tokens.accessToken,
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function refreshController(req, res, next) {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

    if (!refreshToken) {
      return next(
        createAuthenticationError(
          401,
          'MISSING_REFRESH_SESSION',
          'A refresh session is required.',
        ),
      );
    }

    const result = await rotateRefreshSession(refreshToken, {
      userAgent: req.get('user-agent'),
      ipAddress: req.ip,
    });

    const accessToken = generateAccessToken(result.userId);

    res.cookie(
      REFRESH_COOKIE_NAME,
      result.refreshToken,
      REFRESH_COOKIE_OPTIONS,
    );

    return res.status(200).json({
      success: true,
      data: {
        user: result.user,
        accessToken,
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function logoutController(req, res, next) {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

    if (refreshToken) {
      await revokeRefreshSession(refreshToken);
    }

    res.clearCookie(REFRESH_COOKIE_NAME, {
      httpOnly: REFRESH_COOKIE_OPTIONS.httpOnly,
      secure: REFRESH_COOKIE_OPTIONS.secure,
      sameSite: REFRESH_COOKIE_OPTIONS.sameSite,
      path: REFRESH_COOKIE_OPTIONS.path,
    });

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
    });
  } catch (error) {
    return next(error);
  }
}

export async function requestEmailVerificationController(req, res, next) {
  try {
    const result = await requestEmailVerification(req.user.id);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

export async function confirmEmailVerificationController(req, res, next) {
  try {
    const result = await verifyEmailAddress({
      userId: req.user.id,
      challengeId: req.body.challengeId,
      otp: req.body.otp,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

export async function requestPasswordResetController(req, res, next) {
  try {
    const challenge = await createPasswordResetChallenge(req.body.email);

    return sendPasswordResetRequestResponse(res, challenge);
  } catch (error) {
    return next(error);
  }
}

export async function verifyPasswordResetOtpController(req, res, next) {
  try {
    const result = await verifyPasswordResetOtp({
      challengeId: req.body.challengeId,
      otp: req.body.otp,
    });

    return res.status(200).json({
      success: true,
      data: {
        resetToken: result.resetToken,
        expiresAt: result.expiresAt,
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function confirmPasswordResetController(req, res, next) {
  try {
    const result = await resetPassword({
      resetToken: req.body.resetToken,
      newPassword: req.body.newPassword,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}