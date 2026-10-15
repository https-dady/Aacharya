import { Router } from 'express';
import { z } from 'zod';

import {
  loginController,
  refreshController,
  logoutController,
} from '../controllers/auth.controller.js';

import { validate } from '../middleware/validate.middleware.js';
import { authRateLimiter } from '../middleware/rate-limit.middleware.js';

const authRouter = Router();

const loginSchema = z.object({
  body: z.object({
    institutionalId: z.string().trim().min(2).max(50),
    password: z.string().min(1).max(256),
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

export default authRouter;