import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  hashPassword,
  comparePassword,
} from '../src/services/auth/password.service.js';

describe('Password Service', () => {
  it('should hash a valid password', async () => {
    const password = 'SecurePassword@123';
    const passwordHash = await hashPassword(password);

    assert.equal(typeof passwordHash, 'string');
    assert.notEqual(passwordHash, password);
    assert.match(passwordHash, /^\$2[aby]\$12\$/);
  });

  it('should verify the correct password', async () => {
    const password = 'SecurePassword@123';
    const passwordHash = await hashPassword(password);

    const isMatch = await comparePassword(password, passwordHash);

    assert.equal(isMatch, true);
  });

  it('should reject an incorrect password', async () => {
    const passwordHash = await hashPassword('SecurePassword@123');

    const isMatch = await comparePassword(
      'WrongPassword@123',
      passwordHash,
    );

    assert.equal(isMatch, false);
  });

  it('should reject passwords shorter than 8 characters', async () => {
    await assert.rejects(
      hashPassword('Short1!'),
      /at least 8 characters/,
    );
  });

  it('should reject passwords exceeding 72 UTF-8 bytes', async () => {
    const password = 'a'.repeat(73);

    await assert.rejects(
      hashPassword(password),
      /72 UTF-8 bytes/,
    );
  });

  it('should reject non-string passwords when hashing', async () => {
    await assert.rejects(
      hashPassword(12345678),
      {
        name: 'TypeError',
        message: 'Password must be a string.',
      },
    );
  });

  it('should return false for an empty password during comparison', async () => {
    const result = await comparePassword('', '$2b$12$invalid');

    assert.equal(result, false);
  });

  it('should return false for an empty password hash', async () => {
    const result = await comparePassword(
      'SecurePassword@123',
      '',
    );

    assert.equal(result, false);
  });
});