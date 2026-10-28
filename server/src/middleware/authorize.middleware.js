import { USER_ROLES } from '../models/user.model.js';

const ALLOWED_ROLES = new Set(Object.values(USER_ROLES));

function createAuthorizationError(statusCode, code, message) {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.code = code;
  error.expose = true;

  return error;
}

export function authorize(...allowedRoles) {
  if (
    allowedRoles.length === 0
    || allowedRoles.some((role) => !ALLOWED_ROLES.has(role))
  ) {
    throw new TypeError(
      'Authorization middleware requires valid allowed roles.',
    );
  }

  const allowed = new Set(allowedRoles);

  return function authorizeRequest(req, res, next) {
    if (!req.user) {
      return next(
        createAuthorizationError(
          401,
          'UNAUTHORIZED',
          'Authentication is required.',
        ),
      );
    }

    const userRoles = Array.isArray(req.user.roles)
      ? req.user.roles
      : [req.user.role];

    if (!userRoles.some((role) => allowed.has(role))) {
      return next(
        createAuthorizationError(
          403,
          'FORBIDDEN',
          'You do not have permission to perform this action.',
        ),
      );
    }

    if (req.user.isEmailVerified !== true) {
      return next(
        createAuthorizationError(
          403,
          'EMAIL_VERIFICATION_REQUIRED',
          'Verify your email address before accessing this resource.',
        ),
      );
    }

    return next();
  };
}