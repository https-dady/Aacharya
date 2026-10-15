import { rateLimit } from 'express-rate-limit';

const DEFAULT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_MAX_REQUESTS = 100;

export function createApiRateLimiter({
  windowMs = DEFAULT_WINDOW_MS,
  limit = DEFAULT_MAX_REQUESTS,
} = {}) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many requests. Please try again later.',
      },
    },
    handler: (_req, res) => {
      res.status(429).json({
        success: false,
        error: {
          code: 'TOO_MANY_REQUESTS',
          message: 'Too many requests. Please try again later.',
        },
      });
    },
  });
}

export const apiRateLimiter = createApiRateLimiter();

export const authRateLimiter = createApiRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
});