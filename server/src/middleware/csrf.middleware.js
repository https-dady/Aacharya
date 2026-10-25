import { env } from '../config/env.js';

function createCsrfError(message) {
  const error = new Error(message);
  error.statusCode = 403;
  error.code = 'CSRF_ORIGIN_REJECTED';
  error.expose = true;
  return error;
}

/**
 * Protects cookie-authenticated state-changing endpoints.
 * Browser requests must originate from the configured frontend.
 * Non-browser callers may omit Origin in non-production environments only.
 */
export function requireTrustedOrigin(req, res, next) {
  const origin = req.get('origin');

  if (!origin) {
    if (env.nodeEnv === 'production') {
      return next(createCsrfError('A trusted request origin is required.'));
    }
    return next();
  }

  let normalizedOrigin;
  try {
    normalizedOrigin = new URL(origin).origin;
  } catch {
    return next(createCsrfError('The request origin is invalid.'));
  }

  if (normalizedOrigin !== env.clientUrl) {
    return next(createCsrfError('The request origin is not allowed.'));
  }

  return next();
}

export default requireTrustedOrigin;
