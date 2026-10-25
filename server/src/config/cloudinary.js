import { v2 as cloudinary } from 'cloudinary';

import { env } from './env.js';

let configured = false;

const REQUIRED_ENVIRONMENT_VARIABLES = Object.freeze([
  ['cloudName', 'CLOUDINARY_CLOUD_NAME'],
  ['apiKey', 'CLOUDINARY_API_KEY'],
  ['apiSecret', 'CLOUDINARY_API_SECRET'],
]);

/**
 * Configure Cloudinary using validated application configuration.
 * An entirely absent configuration is supported for local development;
 * storage operations remain unavailable until credentials are configured.
 * Partial credentials are rejected rather than silently disabling storage.
 */
export function configureCloudinary(configuration = env.cloudinary) {
  configured = false;

  const normalized = Object.fromEntries(
    REQUIRED_ENVIRONMENT_VARIABLES.map(([key]) => [
      key,
      typeof configuration?.[key] === 'string'
        ? configuration[key].trim()
        : '',
    ]),
  );

  const configuredCount = Object.values(normalized).filter(Boolean).length;

  if (configuredCount === 0) {
    configured = false;
    return false;
  }

  if (configuredCount !== REQUIRED_ENVIRONMENT_VARIABLES.length) {
    const missing = REQUIRED_ENVIRONMENT_VARIABLES
      .filter(([key]) => !normalized[key])
      .map(([, environmentName]) => environmentName);

    throw new Error(
      `Cloudinary configuration is incomplete. Missing: ${missing.join(', ')}.`,
    );
  }

  cloudinary.config({
    cloud_name: normalized.cloudName,
    api_key: normalized.apiKey,
    api_secret: normalized.apiSecret,
    secure: true,
  });

  configured = true;
  return cloudinary;
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
