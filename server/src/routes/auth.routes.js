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

import { authenticate } from '../middleware/auth.middleware.js';

import { validate } from '../middleware/validate.middleware.js';

import { authRateLimiter } from '../middleware/rate-limit.middleware.js';

const authRouter = Router();

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
    challengeId: z.string().regex(/^[a-f\d]{24}$/i),
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
    challengeId: z.string().regex(/^[a-f\d]{24}$/i),
    otp: z.string().regex(/^\d{6}$/),
  }).strict(),
});

const confirmPasswordResetSchema = z.object({
  body: z.object({
    resetToken: z.string().min(32).max(128),
    newPassword: z.string().min(8).max(256),
  }).strict(),
});

authRouter.post(
  '/login',
  authRateLimiter,
  validate(loginSchema),
  loginController,
);

authRouter.post(
  '/refresh',
  authRateLimiter,
  refreshController,
);

authRouter.post(
  '/logout',
  logoutController,
);

authRouter.post(
  '/email/verification/request',
  authenticate,
  authRateLimiter,
  validate(emailVerificationSchema),
  requestEmailVerificationController,
);

authRouter.post(
  '/email/verification/confirm',
  authenticate,
  authRateLimiter,
  validate(confirmEmailVerificationSchema),
  confirmEmailVerificationController,
);

authRouter.post(
  '/password/reset/request',
  authRateLimiter,
  validate(requestPasswordResetSchema),
  requestPasswordResetController,
);

authRouter.post(
  '/password/reset/verify',
  authRateLimiter,
  validate(verifyPasswordResetOtpSchema),
  verifyPasswordResetOtpController,
);

authRouter.post(
  '/password/reset/confirm',
  authRateLimiter,
  validate(confirmPasswordResetSchema),
  confirmPasswordResetController,
);

export default authRouter;