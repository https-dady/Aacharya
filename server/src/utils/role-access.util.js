/**
 * Returns all roles assigned to a user.
 *
 * Supports legacy accounts that only have a primary `role`
 * and multi-role accounts that also have a `roles` array.
 */
export function getUserRoles(user) {
  if (!user) {
    return [];
  }

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

  return [...roles];
}

/**
 * Checks whether a user has at least one requested role.
 */
export function hasUserRole(user, ...allowedRoles) {
  if (allowedRoles.length === 0) {
    return false;
  }

  const userRoles = new Set(getUserRoles(user));

  return allowedRoles.some((role) => userRoles.has(role));
}

/**
 * Creates a MongoDB role condition that supports both
 * legacy primary-role accounts and multi-role accounts.
 *
 * Usage:
 * User.find({
 *   department: departmentId,
 *   ...buildRoleQuery(USER_ROLES.FACULTY),
 * });
 */
export function buildRoleQuery(...allowedRoles) {
  const roles = [
    ...new Set(
      allowedRoles.filter(
        (role) => typeof role === 'string' && role.trim(),
      ),
    ),
  ];

  if (roles.length === 0) {
    throw new TypeError(
      'At least one valid role is required.',
    );
  }

  return {
    $or: [
      {
        role: {
          $in: roles,
        },
      },
      {
        roles: {
          $in: roles,
        },
      },
    ],
  };
}

/**
 * Adds role matching to an existing MongoDB filter
 * without overwriting its existing conditions.
 */
export function withRoleFilter(filter, ...allowedRoles) {
  if (!filter || typeof filter !== 'object' || Array.isArray(filter)) {
    throw new TypeError(
      'A valid MongoDB filter object is required.',
    );
  }

  const roleQuery = buildRoleQuery(...allowedRoles);

  return {
    ...filter,
    $and: [
      ...(Array.isArray(filter.$and) ? filter.$and : []),
      roleQuery,
    ],
  };
}