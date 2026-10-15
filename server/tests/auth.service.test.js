import assert from 'node:assert/strict';
import test from 'node:test';

import { login } from '../src/services/auth/auth.service.js';

test('rejects login when institutional ID is missing', async () => {
  await assert.rejects(
    () => login({ password: 'ValidPassword123!' }),
    {
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
    },
  );
});

test('rejects login when institutional ID is empty', async () => {
  await assert.rejects(
    () => login({
      institutionalId: '   ',
      password: 'ValidPassword123!',
    }),
    {
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
    },
  );
});

test('rejects login when password is missing', async () => {
  await assert.rejects(
    () => login({ institutionalId: 'STU001' }),
    {
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
    },
  );
});

test('rejects login when password is empty', async () => {
  await assert.rejects(
    () => login({
      institutionalId: 'STU001',
      password: '',
    }),
    {
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
    },
  );
});

test('rejects login when institutional ID is not a string', async () => {
  await assert.rejects(
    () => login({
      institutionalId: 12345,
      password: 'ValidPassword123!',
    }),
    {
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
    },
  );
});

test('rejects login when password is not a string', async () => {
  await assert.rejects(
    () => login({
      institutionalId: 'STU001',
      password: 12345678,
    }),
    {
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
    },
  );
});