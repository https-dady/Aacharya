import { Router } from 'express';
import { z } from 'zod';

import {
  loginController,
  refreshController,
  logoutController,
  requestEmailVerificationController,
  confirmEmailVerificationController,
  requestPasswordResetController,
  verifyPasswordResetOtpController,
  confirmPasswordResetController,
} from '../controllers/auth.controller.js';

import {
  activateStudentAccountController,
} from '../controllers/student-activation.controller.js';

import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { authRateLimiter } from '../middleware/rate-limit.middleware.js';
import { requireTrustedOrigin } from '../middleware/csrf.middleware.js';
import { auditEvent } from '../middleware/audit.middleware.js';

const authRouter = Router();

const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i);

const loginSchema = z.object({
  body: z.object({
    institutionalId: z.string().trim().min(2).max(50),
    password: z.string().min(1).max(256),
  }).strict(),
});

const emailVerificationSchema = z.object({
  body: z.object({}).strict(),
});

const confirmEmailVerificationSchema = z.object({
  body: z.object({
    challengeId: objectIdSchema,
    otp: z.string().regex(/^\d{6}$/),
  }).strict(),
});

const requestPasswordResetSchema = z.object({
  body: z.object({
    email: z.string().trim().email().max(254),
  }).strict(),
});

const verifyPasswordResetOtpSchema = z.object({
  body: z.object({
    challengeId: objectIdSchema,
    otp: z.string().regex(/^\d{6}$/),
  }).strict(),
});

const confirmPasswordResetSchema = z.object({
  body: z.object({
    resetToken: z.string().min(32).max(128),
    newPassword: z.string().min(8).max(72),
  }).strict(),
});

const activateStudentAccountSchema = z.object({
  body: z.object({
    challengeId: objectIdSchema,
    activationToken: z.string().regex(/^[A-Za-z0-9_-]{40,60}$/),
    newPassword: z.string().min(8).max(72),
  }).strict(),
});

authRouter.post(
  '/login',
  requireTrustedOrigin,
  authRateLimiter,
  validate(loginSchema),
  auditEvent({
    action: 'AUTH_LOGIN_ATTEMPT',
    resourceType: 'Authentication',
  }),
  loginController,
);

authRouter.post(
  '/refresh',
  requireTrustedOrigin,
  authRateLimiter,
  auditEvent({
    action: 'AUTH_TOKEN_REFRESH',
    resourceType: 'Authentication',
  }),
  refreshController,
);

authRouter.post(
  '/logout',
  requireTrustedOrigin,
  auditEvent({
    action: 'AUTH_LOGOUT',
    resourceType: 'Authentication',
  }),
  logoutController,
);

authRouter.post(
  '/email/verification/request',
  authenticate,
  authRateLimiter,
  validate(emailVerificationSchema),
  auditEvent({
    action: 'EMAIL_VERIFICATION_REQUEST',
    resourceType: 'EmailVerification',
  }),
  requestEmailVerificationController,
);

authRouter.post(
  '/email/verification/confirm',
  authenticate,
  authRateLimiter,
  validate(confirmEmailVerificationSchema),
  auditEvent({
    action: 'EMAIL_VERIFICATION_CONFIRM',
    resourceType: 'EmailVerification',
    getResourceId: (req) => req.body.challengeId,
  }),
  confirmEmailVerificationController,
);

authRouter.post(
  '/password/reset/request',
  authRateLimiter,
  validate(requestPasswordResetSchema),
  auditEvent({
    action: 'PASSWORD_RESET_REQUEST',
    resourceType: 'PasswordReset',
  }),
  requestPasswordResetController,
);

authRouter.post(
  '/password/reset/verify',
  authRateLimiter,
  validate(verifyPasswordResetOtpSchema),
  auditEvent({
    action: 'PASSWORD_RESET_OTP_VERIFY',
    resourceType: 'PasswordReset',
    getResourceId: (req) => req.body.challengeId,
  }),
  verifyPasswordResetOtpController,
);

authRouter.post(
  '/password/reset/confirm',
  authRateLimiter,
  validate(confirmPasswordResetSchema),
  auditEvent({
    action: 'PASSWORD_RESET_CONFIRM',
    resourceType: 'PasswordReset',
  }),
  confirmPasswordResetController,
);

/*
 * Activate a student account with the single-use token delivered
 * to the student's registered email address.
 *
 * POST /api/v1/auth/student/activation/confirm
 *
 * Public endpoint: the student has not established a session yet.
 * Trusted-origin checks, request validation, and rate limiting apply.
 */
authRouter.post(
  '/student/activation/confirm',
  requireTrustedOrigin,
  authRateLimiter,
  validate(activateStudentAccountSchema),
  auditEvent({
    action: 'STUDENT_ACTIVATION_CONFIRM',
    resourceType: 'StudentActivation',
  }),
  activateStudentAccountController,
);

export default authRouter;