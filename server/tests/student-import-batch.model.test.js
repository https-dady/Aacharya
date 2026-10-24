import test from 'node:test';
import assert from 'node:assert/strict';

import mongoose from 'mongoose';

import {
  StudentImportBatch,
  STUDENT_IMPORT_BATCH_STATUSES,
} from '../src/models/student-import-batch.model.js';

test(
  'StudentImportBatch model is registered correctly',
  () => {
    assert.equal(
      StudentImportBatch.modelName,
      'StudentImportBatch',
    );

    assert.equal(
      StudentImportBatch.schema.options.strict,
      'throw',
    );

    assert.equal(
      StudentImportBatch.schema.options.versionKey,
      false,
    );
  },
);

test(
  'defines the unique mentor, section, and idempotency key index',
  () => {
    const indexes = StudentImportBatch.schema.indexes();

    const uniqueIndex = indexes.find(
      ([fields, options]) =>
        fields.mentor === 1
        && fields.section === 1
        && fields.idempotencyKey === 1
        && options.unique === true,
    );

    assert.ok(
      uniqueIndex,
      'Expected a unique compound idempotency index.',
    );

    assert.equal(
      uniqueIndex[1].name,
      'uniq_mentor_section_import_idempotency',
    );
  },
);

test(
  'defines the completedAt lookup index',
  () => {
    const indexes = StudentImportBatch.schema.indexes();

    const lookupIndex = indexes.find(
      ([fields]) =>
        fields.mentor === 1
        && fields.section === 1
        && fields.completedAt === -1,
    );

    assert.ok(
      lookupIndex,
      'Expected the mentor/section/completedAt lookup index.',
    );
  },
);

test(
  'allows only the COMPLETED import status',
  () => {
    assert.deepEqual(
      STUDENT_IMPORT_BATCH_STATUSES,
      {
        COMPLETED: 'COMPLETED',
      },
    );

    const statusPath =
      StudentImportBatch.schema.path('status');

    assert.deepEqual(
      statusPath.enumValues,
      ['COMPLETED'],
    );
  },
);

test(
  'requires the mentor, department, batch, section, key, and payload hash',
  async () => {
    const record = new StudentImportBatch({
      importedCount: 0,
    });

    await assert.rejects(
      record.validate(),
      (error) => {
        assert.ok(
          error instanceof mongoose.Error.ValidationError,
        );

        const requiredFields = [
          'mentor',
          'department',
          'batch',
          'section',
          'idempotencyKey',
          'payloadHash',
        ];

        for (const field of requiredFields) {
          assert.ok(
            error.errors[field],
            `Expected ${field} to be required.`,
          );
        }

        return true;
      },
    );
  },
);

test(
  'rejects payload hashes that are not SHA-256 hexadecimal digests',
  async () => {
    const record = new StudentImportBatch({
      mentor: new mongoose.Types.ObjectId(),
      department: new mongoose.Types.ObjectId(),
      batch: new mongoose.Types.ObjectId(),
      section: new mongoose.Types.ObjectId(),
      idempotencyKey: 'student-import-key-001',
      payloadHash: 'invalid-hash',
      importedCount: 0,
    });

    await assert.rejects(
      record.validate(),
      (error) => {
        assert.ok(
          error instanceof mongoose.Error.ValidationError,
        );

        assert.ok(error.errors.payloadHash);

        return true;
      },
    );
  },
);

test(
  'rejects idempotency keys outside the permitted length',
  async () => {
    const record = new StudentImportBatch({
      mentor: new mongoose.Types.ObjectId(),
      department: new mongoose.Types.ObjectId(),
      batch: new mongoose.Types.ObjectId(),
      section: new mongoose.Types.ObjectId(),
      idempotencyKey: 'short',
      payloadHash: 'a'.repeat(64),
      importedCount: 0,
    });

    await assert.rejects(
      record.validate(),
      (error) => {
        assert.ok(
          error instanceof mongoose.Error.ValidationError,
        );

        assert.ok(error.errors.idempotencyKey);

        return true;
      },
    );
  },
);

test(
  'rejects negative imported counts',
  async () => {
    const record = new StudentImportBatch({
      mentor: new mongoose.Types.ObjectId(),
      department: new mongoose.Types.ObjectId(),
      batch: new mongoose.Types.ObjectId(),
      section: new mongoose.Types.ObjectId(),
      idempotencyKey: 'student-import-key-001',
      payloadHash: 'a'.repeat(64),
      importedCount: -1,
    });

    await assert.rejects(
      record.validate(),
      (error) => {
        assert.ok(
          error instanceof mongoose.Error.ValidationError,
        );

        assert.ok(error.errors.importedCount);

        return true;
      },
    );
  },
);