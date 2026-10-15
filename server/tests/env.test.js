import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { describe, it } from 'node:test';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const testDirectory = dirname(fileURLToPath(import.meta.url));
const serverDirectory = resolve(testDirectory, '..');

function loadEnvironment(overrides = {}) {
  const childEnvironment = {
    ...process.env,
    NODE_ENV: 'test',
    PORT: '5000',
    CLIENT_URL: 'http://localhost:5173',
    MONGODB_URI: '',
    LOG_LEVEL: 'info',

    // Isolate JWT configuration for environment tests.
    JWT_ACCESS_SECRET: '',
    JWT_REFRESH_SECRET: '',
    JWT_ACCESS_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',

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

describe('Environment configuration', () => {
  it('loads valid environment configuration', () => {
    const result = loadEnvironment({
      NODE_ENV: 'test',
      PORT: '5000',
      CLIENT_URL: 'http://localhost:5173',
      LOG_LEVEL: 'info',
    });

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
    assert.match(result.stderr, /CLIENT_URL must use HTTP or HTTPS/);
  });

  it('requires MongoDB configuration in production', () => {
    const result = loadEnvironment({
      NODE_ENV: 'production',
      MONGODB_URI: '',
    });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /MONGODB_URI is required in production/);
  });
});