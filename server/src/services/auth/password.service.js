import bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_BYTES = 72;

export async function hashPassword(password) {
  validatePassword(password);

  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function comparePassword(password, passwordHash) {
  if (typeof password !== 'string' || password.length === 0) {
    return false;
  }

  if (typeof passwordHash !== 'string' || passwordHash.length === 0) {
    return false;
  }

  return bcrypt.compare(password, passwordHash);
}

function validatePassword(password) {
  if (typeof password !== 'string') {
    throw new TypeError('Password must be a string.');
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `Password must contain at least ${MIN_PASSWORD_LENGTH} characters.`,
    );
  }

  if (Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES) {
    throw new Error(
      `Password cannot exceed ${MAX_PASSWORD_BYTES} UTF-8 bytes.`,
    );
  }
}