const ALLOWED_ROLES = new Set([
  'SUPER_ADMIN',
  'HOD',
  'FACULTY',
  'MENTOR',
  'STUDENT',
  'ALUMNI',
]);

export function authorize(...allowedRoles) {
  if (
    allowedRoles.length === 0
    || allowedRoles.some(
      (role) => !ALLOWED_ROLES.has(role),
    )
  ) {
    throw new TypeError(
      'Authorization middleware requires valid allowed roles.',
    );
  }

  return function authorizeRequest(req, res, next) {
    if (!req.user) {
      const error = new Error('Authentication is required.');
      error.statusCode = 401;
      error.code = 'UNAUTHORIZED';
      return next(error);
    }

    const userRoles = Array.isArray(req.user.roles)
      ? req.user.roles
      : [req.user.role];

    const hasPermission = userRoles.some(
      (role) => allowedRoles.includes(role),
    );

    if (!hasPermission) {
      const error = new Error(
        'You do not have permission to perform this action.',
      );

      error.statusCode = 403;
      error.code = 'FORBIDDEN';

      return next(error);
    }

    return next();
  };
}