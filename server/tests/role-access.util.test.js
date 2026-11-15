import assert from 'node:assert/strict';
import test from 'node:test';

import { USER_ROLES } from '../src/models/user.model.js';

import {
  buildRoleQuery,
  getUserRoles,
  hasUserRole,
  withRoleFilter,
} from '../src/utils/role-access.util.js';

test('returns no effective roles for a missing user', () => {
  assert.deepEqual(getUserRoles(null), []);
});

test('preserves the primary role and removes duplicate assigned roles', () => {
  assert.deepEqual(
    getUserRoles({
      role: USER_ROLES.FACULTY,
      roles: [USER_ROLES.FACULTY, USER_ROLES.MENTOR],
    }),
    [USER_ROLES.FACULTY, USER_ROLES.MENTOR],
  );
});

test('derives Faculty capability for a legacy primary HOD account', () => {
  assert.deepEqual(
    getUserRoles({
      role: USER_ROLES.HOD,
      roles: [],
    }),
    [USER_ROLES.HOD, USER_ROLES.FACULTY],
  );
});

test('derives Faculty capability for a legacy primary Mentor account', () => {
  assert.deepEqual(
    getUserRoles({
      role: USER_ROLES.MENTOR,
    }),
    [USER_ROLES.MENTOR, USER_ROLES.FACULTY],
  );
});

test('derives Faculty capability when HOD or Mentor is an additional role', () => {
  assert.deepEqual(
    getUserRoles({
      role: USER_ROLES.FACULTY,
      roles: [USER_ROLES.HOD],
    }),
    [USER_ROLES.FACULTY, USER_ROLES.HOD],
  );

  assert.deepEqual(
    getUserRoles({
      role: USER_ROLES.STUDENT,
      roles: [USER_ROLES.MENTOR],
    }),
    [
      USER_ROLES.STUDENT,
      USER_ROLES.MENTOR,
      USER_ROLES.FACULTY,
    ],
  );
});

test('does not grant Faculty capability to unrelated roles', () => {
  assert.deepEqual(
    getUserRoles({
      role: USER_ROLES.STUDENT,
      roles: [USER_ROLES.ALUMNI],
    }),
    [USER_ROLES.STUDENT, USER_ROLES.ALUMNI],
  );
});

test('hasUserRole checks effective capabilities', () => {
  assert.equal(
    hasUserRole(
      { role: USER_ROLES.HOD },
      USER_ROLES.FACULTY,
    ),
    true,
  );

  assert.equal(
    hasUserRole(
      { role: USER_ROLES.STUDENT },
      USER_ROLES.FACULTY,
    ),
    false,
  );
});

test('buildRoleQuery includes legacy HOD and Mentor primary roles for Faculty queries', () => {
  assert.deepEqual(
    buildRoleQuery(USER_ROLES.FACULTY),
    {
      $or: [
        {
          role: {
            $in: [USER_ROLES.FACULTY],
          },
        },
        {
          roles: {
            $in: [USER_ROLES.FACULTY],
          },
        },
        {
          role: {
            $in: [
              USER_ROLES.HOD,
              USER_ROLES.MENTOR,
            ],
          },
        },
        {
          roles: {
            $in: [
              USER_ROLES.HOD,
              USER_ROLES.MENTOR,
            ],
          },
        },
      ],
    },
  );
});

test('withRoleFilter preserves existing filters and adds effective role matching', () => {
  const existingCondition = {
    status: 'ACTIVE',
  };

  const result = withRoleFilter(
    existingCondition,
    USER_ROLES.FACULTY,
  );

  assert.equal(result.status, 'ACTIVE');
  assert.equal(result.$and.length, 1);

  assert.deepEqual(
    result.$and[0],
    buildRoleQuery(USER_ROLES.FACULTY),
  );
});

test('buildRoleQuery rejects an empty role list', () => {
  assert.throws(
    () => buildRoleQuery(),
    { name: 'TypeError' },
  );
});