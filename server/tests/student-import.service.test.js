import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseStudentCsv,
  StudentImportError,
} from '../src/services/provisioning/student-import.service.js';

test(
  'parses CSV headers case-insensitively and normalizes student identifiers',
  () => {
    const rows = parseStudentCsv(
      'institutionalId,fullName,password,email\n' +
      'abc123,Test Student,Password123,test@example.com\n',
    );

    assert.equal(rows.length, 1);
    assert.equal(rows[0].institutionalId, 'ABC123');
    assert.equal(rows[0].email, 'test@example.com');
    assert.equal(rows[0].rowNumber, 2);
  },
);

test(
  'supports quoted commas and newlines and preserves source row numbers',
  () => {
    const rows = parseStudentCsv(
      'institutionalId,fullName,password\n' +
      'abc123,"Test,\nStudent",Password123\n',
    );

    assert.equal(
      rows[0].fullName,
      'Test,\nStudent',
    );

    assert.equal(rows[0].rowNumber, 2);
  },
);

test(
  'supports optional email and preserves row numbers after blank lines',
  () => {
    const rows = parseStudentCsv(
      'institutionalId,fullName,password\n' +
      '\n' +
      'abc123,Test Student,Password123\n',
    );

    assert.equal(rows[0].email, undefined);
    assert.equal(rows[0].rowNumber, 3);
  },
);

test(
  'rejects duplicate IDs and emails in the same file',
  () => {
    assert.throws(
      () =>
        parseStudentCsv(
          'institutionalId,fullName,password,email\n' +
          'abc123,First Student,Password123,same@example.com\n' +
          'ABC123,Second Student,Password456,same@example.com\n',
        ),

      (error) =>
        error instanceof StudentImportError &&
        error.details.length === 2,
    );
  },
);

test(
  'rejects malformed CSV quoting and passwords exceeding bcrypt byte limit',
  () => {
    assert.throws(
      () =>
        parseStudentCsv(
          'institutionalId,fullName,password\n' +
          'abc123,"Broken,Password123\n',
        ),
      StudentImportError,
    );

    assert.throws(
      () =>
        parseStudentCsv(
          `institutionalId,fullName,password\n` +
          `abc123,Test Student,${'é'.repeat(37)}\n`,
        ),

      (error) =>
        error instanceof StudentImportError &&
        error.details[0].message.includes(
          '72 UTF-8 bytes',
        ),
    );
  },
);