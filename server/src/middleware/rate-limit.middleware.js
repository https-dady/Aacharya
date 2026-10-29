import { ipKeyGenerator, rateLimit } from 'express-rate-limit';

const DEFAULT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_MAX_REQUESTS = 3000;

const AUTH_WINDOW_MS = 15 * 60 * 1000;
const AUTH_MAX_REQUESTS = 10;

function createRateLimiter({
  windowMs,
  limit,
  keyGenerator,
  scope,
}) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator,

    handler: (req, res) => {
      res.setHeader('X-RateLimit-Scope', scope);

      req.log?.warn(
        {
          event: 'rate_limit_exceeded',
          scope,
          method: req.method,
          path: req.originalUrl,
          ip: req.ip,
          windowMs,
          limit,
        },
        'Request rejected by rate limiter',
      );

      return res.status(429).json({
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
    scope: 'global_api',
    keyGenerator: (req) => ipKeyGenerator(req.ip),
  });
}

// Strict rate limiting for sensitive operations.
// Each matched route receives its own counter per client IP.
export const authRateLimiter = createRateLimiter({
  windowMs: AUTH_WINDOW_MS,
  limit: AUTH_MAX_REQUESTS,
  scope: 'sensitive_operation',

  keyGenerator: (req) => {
    const ipKey = ipKeyGenerator(req.ip);
    const routePath = req.route?.path ?? req.path;
    const routeScope = `${req.baseUrl}:${routePath}`;

    return `${ipKey}:${routeScope}`;
  },
});

// Global API protection.
export const apiRateLimiter = createApiRateLimiter();