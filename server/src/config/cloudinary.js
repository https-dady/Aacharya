import { v2 as cloudinary } from 'cloudinary';

import { env } from './env.js';

let configured = false;

export function configureCloudinary() {
  const configuration = env.cloudinary;

  if (!configuration?.enabled) {
    configured = false;
    return false;
  }

  const { cloudName, apiKey, apiSecret } = configuration;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      'Cloudinary is enabled, but its configuration is incomplete.',
    );
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  configured = true;

  return true;
}

export function isCloudinaryConfigured() {
  return configured;
}

export function getCloudinary() {
  if (!configured) {
    throw new Error(
      'Cloudinary is not configured. Configure it before performing storage operations.',
    );
  }

  return cloudinary;
}

export default getCloudinary;