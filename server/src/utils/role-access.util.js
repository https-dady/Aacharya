import { USER_ROLES } from '../models/user.model.js';

/**
 * Returns all effective roles assigned to a user.
 *
 * The primary role is always preserved. Additional roles are merged
 * without duplicates. HOD and Mentor accounts automatically receive
 * the shared Faculty teaching capability, including legacy accounts
 * whose persisted `roles` array predates capability synchronization.
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

  if (
    roles.has(USER_ROLES.HOD)
    || roles.has(USER_ROLES.MENTOR)
  ) {
    roles.add(USER_ROLES.FACULTY);
  }

  return [...roles];
}

/**
 * Checks whether a user has at least one requested effective role.
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

  const roleConditions = [
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
  ];

  // Support legacy HOD/Mentor accounts without persisted FACULTY.
  if (roles.includes(USER_ROLES.FACULTY)) {
    roleConditions.push({
      role: {
        $in: [USER_ROLES.HOD, USER_ROLES.MENTOR],
      },
    });

    roleConditions.push({
      roles: {
        $in: [USER_ROLES.HOD, USER_ROLES.MENTOR],
      },
    });
  }

  return {
    $or: roleConditions,
  };
}

/**
 * Adds role matching to an existing MongoDB filter.
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