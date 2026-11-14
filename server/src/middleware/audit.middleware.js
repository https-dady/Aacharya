import {
  User,
  USER_ROLES,
  ACCOUNT_STATUSES,
} from '../models/user.model.js';

import {
  verifyAccessToken,
} from '../services/auth/token.service.js';

function createAuthError(statusCode, code, message) {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.code = code;
  error.expose = true;

  return error;
}

/**
 * Resolve effective account capabilities.
 *
 * Primary role is never modified.
 *
 * Faculty is a shared teaching capability:
 * - FACULTY -> FACULTY
 * - MENTOR -> MENTOR + FACULTY
 * - HOD -> HOD + FACULTY
 *
 * Existing role assignments are preserved.
 */
function normalizeUserRoles(user) {
  const roles = new Set();

  if (typeof user.role === 'string' && user.role.trim()) {
    roles.add(user.role);
  }

  if (Array.isArray(user.roles)) {
    for (const role of user.roles) {
      if (typeof role === 'string' && role.trim()) {
        roles.add(role);
      }
    }
  }

  const hasTeachingCapability =
    roles.has(USER_ROLES.FACULTY)
    || roles.has(USER_ROLES.MENTOR)
    || roles.has(USER_ROLES.HOD);

  if (hasTeachingCapability) {
    roles.add(USER_ROLES.FACULTY);
  }

  return [...roles];
}

export async function authenticate(req, res, next) {
  const authorization = req.get('authorization');

  if (!authorization) {
    return next(
      createAuthError(
        401,
        'UNAUTHORIZED',
        'Authentication is required.',
      ),
    );
  }

  const [scheme, token, ...extraParts] = authorization
    .trim()
    .split(/\s+/);

  if (
    scheme?.toLowerCase() !== 'bearer'
    || !token
    || extraParts.length > 0
  ) {
    return next(
      createAuthError(
        401,
        'INVALID_TOKEN',
        'A valid access token is required.',
      ),
    );
  }

  let payload;

  try {
    payload = verifyAccessToken(token);
  } catch {
    return next(
      createAuthError(
        401,
        'INVALID_TOKEN',
        'The access token is invalid or expired.',
      ),
    );
  }

  try {
    const user = await User.findById(payload.userId)
      .select(
        '_id role roles status isEmailVerified +tokenVersion',
      )
      .lean()
      .exec();

    if (!user) {
      return next(
        createAuthError(
          401,
          'ACCOUNT_NOT_FOUND',
          'The account associated with this token no longer exists.',
        ),
      );
    }

    if (user.status !== ACCOUNT_STATUSES.ACTIVE) {
      return next(
        createAuthError(
          403,
          'ACCOUNT_INACTIVE',
          'Your account is suspended or disabled.',
        ),
      );
    }

    const currentTokenVersion = user.tokenVersion ?? 0;
    const accessTokenVersion = payload.tokenVersion ?? 0;

    if (accessTokenVersion !== currentTokenVersion) {
      return next(
        createAuthError(
          401,
          'TOKEN_REVOKED',
          'Your session is no longer valid. Please log in again.',
        ),
      );
    }

    const userRoles = normalizeUserRoles(user);

    if (userRoles.length === 0) {
      return next(
        createAuthError(
          403,
          'ACCOUNT_ROLE_MISSING',
          'No valid role is assigned to this account.',
        ),
      );
    }

    req.user = {
      id: user._id.toString(),
      _id: user._id.toString(),

      // Preserve the original primary role.
      role: user.role,

      // Effective roles used by backend authorization.
      roles: userRoles,

      isEmailVerified: user.isEmailVerified === true,
    };

    return next();
  } catch (error) {
    return next(error);
  }
}