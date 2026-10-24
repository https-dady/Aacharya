import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { describe, it } from 'node:test';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const testDirectory = dirname(fileURLToPath(import.meta.url));
const serverDirectory = resolve(testDirectory, '..');

const TEST_IDEMPOTENCY_SECRET =
  'test-only-student-import-idempotency-secret';

function loadEnvironment(overrides = {}) {
  const childEnvironment = {
    ...process.env,

    NODE_ENV: 'test',
    PORT: '5000',
    CLIENT_URL: 'http://localhost:5173',
    MONGODB_URI: '',
    LOG_LEVEL: 'info',

    JWT_ACCESS_SECRET: '',
    JWT_REFRESH_SECRET: '',
    JWT_ACCESS_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',

    PASSWORD_RESET_OTP_SECRET: '',
    STUDENT_IMPORT_IDEMPOTENCY_SECRET:
      TEST_IDEMPOTENCY_SECRET,

    ...overrides,
  };

  const result = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      "import('./src/config/env.js').then(({ env }) => console.log(JSON.stringify(env)))",
    ],
    {
      cwd: serverDirectory,
      env: childEnvironment,
      encoding: 'utf8',
      timeout: 5000,
    },
  );

  return result;
}

function loadProductionEnvironment(overrides = {}) {
  return loadEnvironment({
    NODE_ENV: 'production',
    PORT: '5000',
    CLIENT_URL: 'https://example.com',
    MONGODB_URI: 'mongodb://127.0.0.1:27017/aacharya_lms',
    LOG_LEVEL: 'info',

    JWT_ACCESS_SECRET: 'access-secret-for-production-testing-123456',
    JWT_REFRESH_SECRET: 'refresh-secret-for-production-testing-654321',
    PASSWORD_RESET_OTP_SECRET: 'otp-secret-for-production-testing-123456',

    STUDENT_IMPORT_IDEMPOTENCY_SECRET:
      'idempotency-secret-for-production-testing-123456',

    ...overrides,
  });
}

describe('Environment configuration', () => {
  it('loads valid environment configuration', () => {
    const result = loadEnvironment();

    assert.equal(result.status, 0, result.stderr);

    const configuration = JSON.parse(result.stdout.trim());

    assert.equal(configuration.nodeEnv, 'test');
    assert.equal(configuration.port, 5000);
    assert.equal(configuration.clientUrl, 'http://localhost:5173');
    assert.equal(configuration.logLevel, 'info');

    assert.equal(configuration.jwt.accessSecret, '');
    assert.equal(configuration.jwt.refreshSecret, '');
    assert.equal(configuration.jwt.accessExpiresIn, '15m');
    assert.equal(configuration.jwt.refreshExpiresIn, '7d');

    assert.equal(
      configuration.studentImport.idempotencySecret,
      TEST_IDEMPOTENCY_SECRET,
    );
  });

  it('rejects an invalid port', () => {
    const result = loadEnvironment({
      PORT: '70000',
    });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /PORT must be an integer/);
  });

  it('rejects an unsupported log level', () => {
    const result = loadEnvironment({
      LOG_LEVEL: 'verbose',
    });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /LOG_LEVEL must be one of/);
  });

  it('rejects a client URL with an unsupported protocol', () => {
    const result = loadEnvironment({
      CLIENT_URL: 'ftp://localhost:5173',
    });

    assert.notEqual(result.status, 0);
    assert.match(
      result.stderr,
      /CLIENT_URL must use HTTP or HTTPS/,
    );
  });

  it('requires MongoDB configuration in production', () => {
    const result = loadEnvironment({
      NODE_ENV: 'production',
      MONGODB_URI: '',
    });

    assert.notEqual(result.status, 0);
    assert.match(
      result.stderr,
      /MONGODB_URI is required in production/,
    );
  });

  it('rejects a missing idempotency secret in production', () => {
    const result = loadProductionEnvironment({
      STUDENT_IMPORT_IDEMPOTENCY_SECRET: '',
    });

    assert.notEqual(result.status, 0);
    assert.match(
      result.stderr,
      /STUDENT_IMPORT_IDEMPOTENCY_SECRET must contain at least 32 characters in production/,
    );
  });

  it('rejects a short idempotency secret in production', () => {
    const result = loadProductionEnvironment({
      STUDENT_IMPORT_IDEMPOTENCY_SECRET: 'too-short',
    });

    assert.notEqual(result.status, 0);
    assert.match(
      result.stderr,
      /STUDENT_IMPORT_IDEMPOTENCY_SECRET must contain at least 32 characters in production/,
    );
  });

  it('accepts a sufficiently long idempotency secret in production', () => {
    const secret =
      'production-student-import-idempotency-secret-123456';

    const result = loadProductionEnvironment({
      STUDENT_IMPORT_IDEMPOTENCY_SECRET: secret,
    });

    assert.equal(result.status, 0, result.stderr);

    const configuration = JSON.parse(result.stdout.trim());

    assert.equal(
      configuration.studentImport.idempotencySecret,
      secret,
    );
  });

  it('rejects an idempotency secret reused as a JWT secret', () => {
    const sharedSecret =
      'shared-production-secret-that-is-long-enough-123456';

    const result = loadProductionEnvironment({
      JWT_ACCESS_SECRET: sharedSecret,
      STUDENT_IMPORT_IDEMPOTENCY_SECRET: sharedSecret,
    });

    assert.notEqual(result.status, 0);
    assert.match(
      result.stderr,
      /STUDENT_IMPORT_IDEMPOTENCY_SECRET must differ from JWT and password-reset OTP secrets/,
    );
  });

  it('rejects an idempotency secret reused as the OTP secret', () => {
    const sharedSecret =
      'shared-production-secret-that-is-long-enough-123456';

    const result = loadProductionEnvironment({
      PASSWORD_RESET_OTP_SECRET: sharedSecret,
      STUDENT_IMPORT_IDEMPOTENCY_SECRET: sharedSecret,
    });

    assert.notEqual(result.status, 0);
    assert.match(
      result.stderr,
      /STUDENT_IMPORT_IDEMPOTENCY_SECRET must differ from JWT and password-reset OTP secrets/,
    );
  });
});