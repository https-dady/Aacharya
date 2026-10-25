import test from 'node:test';
import assert from 'node:assert/strict';

import { v2 as cloudinary } from 'cloudinary';

import {
  configureCloudinary,
  getCloudinary,
  isCloudinaryConfigured,
} from '../src/config/cloudinary.js';

const completeConfiguration = {
  cloudName: 'test-cloud',
  apiKey: 'test-api-key',
  apiSecret: 'test-api-secret',
};

test('allows Cloudinary to remain disabled when no credentials are configured', () => {
  assert.equal(configureCloudinary({}), false);
  assert.equal(isCloudinaryConfigured(), false);
  assert.throws(() => getCloudinary(), /Cloudinary is not configured/);
});

test('rejects partial credentials and identifies missing environment variables', () => {
  assert.throws(
    () => configureCloudinary({ cloudName: 'test-cloud' }),
    (error) => {
      assert.match(error.message, /CLOUDINARY_API_KEY/);
      assert.match(error.message, /CLOUDINARY_API_SECRET/);
      return true;
    },
  );
});

test('configures Cloudinary with trimmed credentials and secure URLs', () => {
  const configuredCloudinary = configureCloudinary({
    cloudName: ' test-cloud ',
    apiKey: ' test-api-key ',
    apiSecret: ' test-api-secret ',
  });

  assert.equal(configuredCloudinary, cloudinary);
  assert.equal(getCloudinary(), cloudinary);
  assert.equal(isCloudinaryConfigured(), true);

  const configuration = cloudinary.config();
  assert.equal(configuration.cloud_name, 'test-cloud');
  assert.equal(configuration.api_key, 'test-api-key');
  assert.equal(configuration.api_secret, 'test-api-secret');
  assert.equal(configuration.secure, true);
});
