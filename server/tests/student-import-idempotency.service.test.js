import test from 'node:test';
import assert from 'node:assert/strict';

import { createHmac } from 'node:crypto';

process.env.NODE_ENV = 'test';
process.env.STUDENT_IMPORT_IDEMPOTENCY_SECRET =
  'test-only-student-import-idempotency-secret';

const {
  validateIdempotencyKey,
  createStudentImportPayloadHash,
  StudentImportIdempotencyError,
} = await import(
  '../src/services/provisioning/student-import-idempotency.service.js'
);

test(
  'accepts a valid Idempotency-Key and trims surrounding whitespace',
  () => {
    const key = validateIdempotencyKey(
      '  student-import-2026-001  ',
    );

    assert.equal(key, 'student-import-2026-001');
  },
);

test(
  'rejects a missing Idempotency-Key',
  () => {
    assert.throws(
      () => validateIdempotencyKey(undefined),
      (error) =>
        error instanceof StudentImportIdempotencyError
        && error.statusCode === 400
        && error.code === 'INVALID_IDEMPOTENCY_KEY',
    );
  },
);

test(
  'rejects keys shorter than the minimum length',
  () => {
    assert.throws(
      () => validateIdempotencyKey('short'),
      StudentImportIdempotencyError,
    );
  },
);

test(
  'rejects keys longer than the maximum length',
  () => {
    assert.throws(
      () => validateIdempotencyKey('a'.repeat(129)),
      StudentImportIdempotencyError,
    );
  },
);

test(
  'rejects keys containing unsupported characters',
  () => {
    assert.throws(
      () => validateIdempotencyKey('student import key!'),
      (error) =>
        error instanceof StudentImportIdempotencyError
        && error.message.includes('unsupported characters'),
    );
  },
);

test(
  'generates a stable HMAC for the same logical payload',
  () => {
    const rows = [
      {
        institutionalId: 'abc123',
        fullName: 'Test Student',
        email: 'TEST@example.com',
        password: 'StudentPassword123',
      },
    ];

    const firstHash = createStudentImportPayloadHash(rows);
    const secondHash = createStudentImportPayloadHash(rows);

    assert.equal(firstHash, secondHash);
    assert.match(firstHash, /^[a-f0-9]{64}$/);
  },
);

test(
  'normalizes identifiers, names, and emails consistently',
  () => {
    const firstHash = createStudentImportPayloadHash([
      {
        institutionalId: ' abc123 ',
        fullName: ' Test Student ',
        email: 'TEST@example.com',
        password: 'StudentPassword123',
      },
    ]);

    const secondHash = createStudentImportPayloadHash([
      {
        institutionalId: 'ABC123',
        fullName: 'Test Student',
        email: 'test@example.com',
        password: 'StudentPassword123',
      },
    ]);

    assert.equal(firstHash, secondHash);
  },
);

test(
  'generates a different HMAC when the password changes',
  () => {
    const originalHash = createStudentImportPayloadHash([
      {
        institutionalId: 'ABC123',
        fullName: 'Test Student',
        email: 'test@example.com',
        password: 'OriginalPassword123',
      },
    ]);

    const changedHash = createStudentImportPayloadHash([
      {
        institutionalId: 'ABC123',
        fullName: 'Test Student',
        email: 'test@example.com',
        password: 'ChangedPassword456',
      },
    ]);

    assert.notEqual(originalHash, changedHash);
  },
);

test(
  'generates a different HMAC when row order changes',
  () => {
    const firstRow = {
      institutionalId: 'ABC123',
      fullName: 'First Student',
      email: 'first@example.com',
      password: 'FirstPassword123',
    };

    const secondRow = {
      institutionalId: 'XYZ789',
      fullName: 'Second Student',
      email: 'second@example.com',
      password: 'SecondPassword123',
    };

    const originalHash = createStudentImportPayloadHash([
      firstRow,
      secondRow,
    ]);

    const reorderedHash = createStudentImportPayloadHash([
      secondRow,
      firstRow,
    ]);

    assert.notEqual(originalHash, reorderedHash);
  },
);

test(
  'rejects an empty import payload',
  () => {
    assert.throws(
      () => createStudentImportPayloadHash([]),
      StudentImportIdempotencyError,
    );
  },
);

test(
  'rejects a non-array import payload',
  () => {
    assert.throws(
      () => createStudentImportPayloadHash(null),
      StudentImportIdempotencyError,
    );
  },
);

test(
  'produces a digest consistent with HMAC-SHA-256',
  () => {
    const secret =
      process.env.STUDENT_IMPORT_IDEMPOTENCY_SECRET;

    const rows = [
      {
        institutionalId: 'ABC123',
        fullName: 'Test Student',
        email: 'test@example.com',
        password: 'StudentPassword123',
      },
    ];

    const canonicalPayload = JSON.stringify([
      {
        institutionalId: 'ABC123',
        fullName: 'Test Student',
        email: 'test@example.com',
        password: 'StudentPassword123',
      },
    ]);

    const expectedHash = createHmac('sha256', secret)
      .update(canonicalPayload, 'utf8')
      .digest('hex');

    assert.equal(
      createStudentImportPayloadHash(rows),
      expectedHash,
    );
  },
);