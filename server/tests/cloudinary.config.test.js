import test from 'node:test';
import assert from 'node:assert/strict';

import { v2 as cloudinary } from 'cloudinary';

import {
  configureCloudinary,
  getCloudinary,
} from '../src/config/cloudinary.js';

const ENV_KEYS = [
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
];

function saveEnvironment() {
  return Object.fromEntries(
    ENV_KEYS.map((key) => [key, process.env[key]]),
  );
}

function restoreEnvironment(savedEnvironment) {
  for (const [key, value] of Object.entries(savedEnvironment)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

function clearCloudinaryEnvironment() {
  for (const key of ENV_KEYS) {
    delete process.env[key];
  }
}

function setCloudinaryEnvironment({
  cloudName = 'test-cloud',
  apiKey = 'test-api-key',
  apiSecret = 'test-api-secret',
} = {}) {
  process.env.CLOUDINARY_CLOUD_NAME = cloudName;
  process.env.CLOUDINARY_API_KEY = apiKey;
  process.env.CLOUDINARY_API_SECRET = apiSecret;
}

test('rejects configuration when required credentials are missing', (t) => {
  const savedEnvironment = saveEnvironment();

  t.after(() => restoreEnvironment(savedEnvironment));

  clearCloudinaryEnvironment();

  assert.throws(
    () => configureCloudinary(),
    /Cloudinary configuration is missing required environment variables/,
  );
});

test('reports all missing Cloudinary environment variables', (t) => {
  const savedEnvironment = saveEnvironment();

  t.after(() => restoreEnvironment(savedEnvironment));

  clearCloudinaryEnvironment();

  assert.throws(
    () => configureCloudinary(),
    (error) => {
      for (const key of ENV_KEYS) {
        assert.ok(error.message.includes(key));
      }

      return true;
    },
  );
});

test('rejects empty or whitespace-only credentials', (t) => {
  const savedEnvironment = saveEnvironment();

  t.after(() => restoreEnvironment(savedEnvironment));

  setCloudinaryEnvironment({
    cloudName: '   ',
    apiKey: '',
    apiSecret: '   ',
  });

  assert.throws(
    () => configureCloudinary(),
    /Cloudinary configuration is missing required environment variables/,
  );
});

test('configures Cloudinary when credentials are present', (t) => {
  const savedEnvironment = saveEnvironment();

  t.after(() => restoreEnvironment(savedEnvironment));

  setCloudinaryEnvironment();

  const configuredCloudinary = configureCloudinary();

  assert.equal(configuredCloudinary, cloudinary);
  assert.equal(getCloudinary(), cloudinary);

  const configuration = cloudinary.config();

  assert.equal(configuration.cloud_name, 'test-cloud');
  assert.equal(configuration.api_key, 'test-api-key');
  assert.equal(configuration.api_secret, 'test-api-secret');
  assert.equal(configuration.secure, true);
});

test('trims whitespace from Cloudinary credentials', (t) => {
  const savedEnvironment = saveEnvironment();

  t.after(() => restoreEnvironment(savedEnvironment));

  setCloudinaryEnvironment({
    cloudName: ' test-cloud ',
    apiKey: ' test-api-key ',
    apiSecret: ' test-api-secret ',
  });

  configureCloudinary();

  const configuration = cloudinary.config();

  assert.equal(configuration.cloud_name, 'test-cloud');
  assert.equal(configuration.api_key, 'test-api-key');
  assert.equal(configuration.api_secret, 'test-api-secret');
});