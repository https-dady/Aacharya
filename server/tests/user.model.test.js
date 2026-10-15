import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  User,
  USER_ROLES,
  ACCOUNT_STATUSES,
} from '../src/models/user.model.js';

describe('User Model', () => {
  it('should reject a user without required fields', async () => {
    const user = new User({});

    await assert.rejects(
      user.validate(),
      (error) => {
        assert.ok(error.errors.institutionalId);
        assert.ok(error.errors.fullName);
        assert.ok(error.errors.passwordHash);
        assert.ok(error.errors.role);

        return true;
      },
    );
  });

  it('should accept a valid user', async () => {
    const user = new User({
      institutionalId: 'STU-1001',
      fullName: 'Test Student',
      passwordHash: 'test-password-hash',
      role: USER_ROLES.STUDENT,
    });

    await user.validate();

    assert.equal(user.institutionalId, 'STU-1001');
    assert.equal(user.fullName, 'Test Student');
    assert.equal(user.role, USER_ROLES.STUDENT);
    assert.equal(user.status, ACCOUNT_STATUSES.ACTIVE);
    assert.equal(user.isEmailVerified, false);
    assert.equal(user.emailVerifiedAt, null);
    assert.equal(user.tokenVersion, 0);
  });

  it('should reject an invalid role', async () => {
    const user = new User({
      institutionalId: 'STU-1002',
      fullName: 'Test Student',
      passwordHash: 'test-password-hash',
      role: 'INVALID_ROLE',
    });

    await assert.rejects(
      user.validate(),
      (error) => {
        assert.ok(error.errors.role);
        return true;
      },
    );
  });

  it('should normalize institutional ID and email', async () => {
    const user = new User({
      institutionalId: 'stu-1003',
      fullName: 'Test Student',
      email: 'STUDENT@EXAMPLE.COM',
      passwordHash: 'test-password-hash',
      role: USER_ROLES.STUDENT,
    });

    await user.validate();

    assert.equal(user.institutionalId, 'STU-1003');
    assert.equal(user.email, 'student@example.com');
  });

  it('should not expose password hash or token version in JSON', () => {
    const user = new User({
      institutionalId: 'STU-1004',
      fullName: 'Test Student',
      passwordHash: 'sensitive-password-hash',
      role: USER_ROLES.STUDENT,
      tokenVersion: 2,
    });

    const result = user.toJSON();

    assert.equal('passwordHash' in result, false);
    assert.equal('tokenVersion' in result, false);
  });

  it('should leave an unverified email without a verification timestamp', async () => {
    const user = new User({
      institutionalId: 'STU-1005',
      fullName: 'Test Student',
      email: 'student@example.com',
      passwordHash: 'test-password-hash',
      role: USER_ROLES.STUDENT,
    });

    await user.validate();

    assert.equal(user.isEmailVerified, false);
    assert.equal(user.emailVerifiedAt, null);
  });

  it('should reject email verification when no email exists', async () => {
    const user = new User({
      institutionalId: 'STU-1006',
      fullName: 'Test Student',
      passwordHash: 'test-password-hash',
      role: USER_ROLES.STUDENT,
      isEmailVerified: true,
    });

    await assert.rejects(
      user.validate(),
      (error) => {
        assert.ok(error.errors.isEmailVerified);
        return true;
      },
    );
  });
});