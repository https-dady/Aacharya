import 'dotenv/config';

const ALLOWED_NODE_ENVIRONMENTS = [
  'development',
  'test',
  'production',
];

const ALLOWED_LOG_LEVELS = [
  'fatal',
  'error',
  'warn',
  'info',
  'debug',
  'trace',
  'silent',
];

function readPort(value) {
  const port = Number(value ?? 5000);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }

  return port;
}

function readNodeEnvironment(value) {
  const nodeEnv = value ?? 'development';

  if (!ALLOWED_NODE_ENVIRONMENTS.includes(nodeEnv)) {
    throw new Error(
      'NODE_ENV must be development, test, or production.',
    );
  }

  return nodeEnv;
}

function readClientUrl(value) {
  const clientUrl = value ?? 'http://localhost:5173';

  let parsedUrl;

  try {
    parsedUrl = new URL(clientUrl);
  } catch {
    throw new Error('CLIENT_URL must be a valid URL.');
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error('CLIENT_URL must use HTTP or HTTPS.');
  }

  if (parsedUrl.username || parsedUrl.password) {
    throw new Error('CLIENT_URL must not contain credentials.');
  }

  return parsedUrl.origin;
}

function readLogLevel(value) {
  const logLevel = value ?? 'info';

  if (!ALLOWED_LOG_LEVELS.includes(logLevel)) {
    throw new Error(
      `LOG_LEVEL must be one of: ${ALLOWED_LOG_LEVELS.join(', ')}.`,
    );
  }

  return logLevel;
}

function readJwtSecret(value, name, nodeEnv) {
  const secret = value?.trim() ?? '';

  if (nodeEnv === 'production' && secret.length < 32) {
    throw new Error(
      `${name} must contain at least 32 characters in production.`,
    );
  }

  return secret;
}

function readJwtExpiry(value, fallback, name) {
  const expiry = value ?? fallback;

  if (
    typeof expiry !== 'string'
    || !/^[1-9]\d*[smhd]$/.test(expiry)
  ) {
    throw new Error(
      `${name} must be a positive duration such as 15m, 1h, or 7d.`,
    );
  }

  return expiry;
}

function readPasswordResetOtpSecret(value, nodeEnv) {
  const secret = value?.trim() ?? '';

  if (nodeEnv === 'production' && secret.length < 32) {
    throw new Error(
      'PASSWORD_RESET_OTP_SECRET must contain at least 32 characters in production.',
    );
  }

  return secret;
}

const nodeEnv = readNodeEnvironment(process.env.NODE_ENV);
const mongodbUri = process.env.MONGODB_URI ?? '';

if (nodeEnv === 'production' && !mongodbUri.trim()) {
  throw new Error('MONGODB_URI is required in production.');
}

const jwtAccessSecret = readJwtSecret(
  process.env.JWT_ACCESS_SECRET,
  'JWT_ACCESS_SECRET',
  nodeEnv,
);

const jwtRefreshSecret = readJwtSecret(
  process.env.JWT_REFRESH_SECRET,
  'JWT_REFRESH_SECRET',
  nodeEnv,
);

if (
  jwtAccessSecret
  && jwtRefreshSecret
  && jwtAccessSecret === jwtRefreshSecret
) {
  throw new Error(
    'JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different.',
  );
}

if (
  nodeEnv === 'production'
  && (!jwtAccessSecret || !jwtRefreshSecret)
) {
  throw new Error(
    'JWT_ACCESS_SECRET and JWT_REFRESH_SECRET are required in production.',
  );
}

const passwordResetOtpSecret = readPasswordResetOtpSecret(
  process.env.PASSWORD_RESET_OTP_SECRET,
  nodeEnv,
);

if (
  passwordResetOtpSecret
  && (
    passwordResetOtpSecret === jwtAccessSecret
    || passwordResetOtpSecret === jwtRefreshSecret
  )
) {
  throw new Error(
    'PASSWORD_RESET_OTP_SECRET must differ from JWT secrets.',
  );
}

export const env = Object.freeze({
  nodeEnv,
  port: readPort(process.env.PORT),
  clientUrl: readClientUrl(process.env.CLIENT_URL),
  mongodbUri,
  logLevel: readLogLevel(process.env.LOG_LEVEL),

  jwt: Object.freeze({
    accessSecret: jwtAccessSecret,
    refreshSecret: jwtRefreshSecret,
    accessExpiresIn: readJwtExpiry(
      process.env.JWT_ACCESS_EXPIRES_IN,
      '15m',
      'JWT_ACCESS_EXPIRES_IN',
    ),
    refreshExpiresIn: readJwtExpiry(
      process.env.JWT_REFRESH_EXPIRES_IN,
      '7d',
      'JWT_REFRESH_EXPIRES_IN',
    ),
  }),

  passwordReset: Object.freeze({
    otpSecret: passwordResetOtpSecret,
    otpExpiresInMinutes: 10,
    maxAttempts: 5,
    maxResends: 3,
  }),
});