import { ipKeyGenerator, rateLimit } from 'express-rate-limit';

const DEFAULT_WINDOW_MS = 15 * 60 * 1000;

// The global limiter should accommodate normal LMS navigation and
// bursts of requests from users sharing a campus or office IP.
const DEFAULT_MAX_REQUESTS = 3000;

const AUTH_WINDOW_MS = 15 * 60 * 1000;
const AUTH_MAX_REQUESTS = 10;

function createRateLimiter({
  windowMs,
  limit,
  keyGenerator,
}) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator,

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

export function createApiRateLimiter({
  windowMs = DEFAULT_WINDOW_MS,
  limit = DEFAULT_MAX_REQUESTS,
} = {}) {
  return createRateLimiter({
    windowMs,
    limit,
    keyGenerator: (req) => ipKeyGenerator(req.ip),
  });
}

// General API traffic: shared IP-based protection with a higher ceiling.
export const apiRateLimiter = createApiRateLimiter();

// Strict protection for sensitive operations.
// Separate endpoint paths get separate counters so requests to unrelated
// endpoints do not all consume the same 10-request allowance.
export const authRateLimiter = createRateLimiter({
  windowMs: AUTH_WINDOW_MS,
  limit: AUTH_MAX_REQUESTS,

  keyGenerator: (req) => {
    const ipKey = ipKeyGenerator(req.ip);
    const routePath = req.route?.path ?? req.path;
    const routeScope = `${req.baseUrl}:${routePath}`;

    return `${ipKey}:${routeScope}`;
  },
});