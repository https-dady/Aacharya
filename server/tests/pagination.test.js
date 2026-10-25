import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parsePagination,
  createPaginationMetadata,
} from '../src/utils/pagination.js';

test('uses defaults when pagination parameters are omitted', () => {
  assert.deepEqual(parsePagination(), { page: 1, limit: 20, skip: 0 });
});

test('parses pagination values and caps the maximum limit', () => {
  assert.deepEqual(parsePagination({ page: '3', limit: '500' }), {
    page: 3,
    limit: 100,
    skip: 200,
  });
});

test('rejects invalid or unsafe pagination values', () => {
  for (const query of [
    { page: '0' },
    { page: '-1' },
    { limit: '1.5' },
    { page: Number.MAX_SAFE_INTEGER, limit: 100 },
  ]) {
    assert.throws(() => parsePagination(query), {
      code: 'INVALID_PAGINATION',
    });
  }
});

test('creates consistent pagination metadata for an empty result set', () => {
  assert.deepEqual(createPaginationMetadata({ page: 1, limit: 20, total: 0 }), {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });
});
