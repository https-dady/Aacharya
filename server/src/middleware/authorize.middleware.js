import { USER_ROLES } from '../models/user.model.js';

const ALLOWED_ROLES = new Set(Object.values(USER_ROLES));

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
      const error = new Error('Authentication is required.');
      error.statusCode = 401;
      error.code = 'UNAUTHORIZED';
      error.expose = true;
      return next(error);
    }

    const userRoles = Array.isArray(req.user.roles)
      ? req.user.roles
      : [req.user.role];

    if (!userRoles.some((role) => allowed.has(role))) {
      const error = new Error(
        'You do not have permission to perform this action.',
      );
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      error.expose = true;
      return next(error);
    }

    return next();
  };
}
