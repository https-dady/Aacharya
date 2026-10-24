import { createHmac } from 'node:crypto';

import { env } from '../../config/env.js';

const MIN_KEY_LENGTH = 16;
const MAX_KEY_LENGTH = 128;

export class StudentImportIdempotencyError extends Error {
  constructor(
    message,
    statusCode = 400,
    code = 'INVALID_IDEMPOTENCY_KEY',
  ) {
    super(message);

    this.name = 'StudentImportIdempotencyError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * Validates the Idempotency-Key supplied by the client.
 *
 * Clients should generate a fresh, unpredictable key for every
 * logically new import and reuse that key when retrying the
 * same request.
 */
export function validateIdempotencyKey(value) {
  if (typeof value !== 'string') {
    throw new StudentImportIdempotencyError(
      'The Idempotency-Key header is required.',
    );
  }

  const key = value.trim();

  if (
    key.length < MIN_KEY_LENGTH
    || key.length > MAX_KEY_LENGTH
  ) {
    throw new StudentImportIdempotencyError(
      `Idempotency-Key must contain between ${MIN_KEY_LENGTH} and ${MAX_KEY_LENGTH} characters.`,
    );
  }

  if (!/^[a-zA-Z0-9._:-]+$/.test(key)) {
    throw new StudentImportIdempotencyError(
      'Idempotency-Key contains unsupported characters.',
    );
  }

  return key;
}

/**
 * Generates a stable HMAC-SHA-256 digest of the logical import
 * payload using the dedicated student-import idempotency secret.
 *
 * Row order is preserved because source row order matters for
 * import reporting and preview results.
 *
 * Passwords are included in the HMAC input so a retry that changes
 * a password cannot silently reuse the previous idempotency key.
 * The original payload and plaintext passwords are never stored
 * by this service.
 */
export function createStudentImportPayloadHash(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new StudentImportIdempotencyError(
      'At least one student record is required to generate a payload hash.',
    );
  }

  const secret = env.studentImport.idempotencySecret;

  if (typeof secret !== 'string' || secret.length === 0) {
    throw new StudentImportIdempotencyError(
      'Student import idempotency is not configured.',
      500,
      'IDEMPOTENCY_CONFIGURATION_ERROR',
    );
  }

  const canonicalRows = rows.map((row) => ({
    institutionalId: String(row.institutionalId ?? '')
      .trim()
      .toUpperCase(),

    fullName: String(row.fullName ?? '').trim(),

    email: row.email
      ? String(row.email).trim().toLowerCase()
      : null,

    password: String(row.password ?? ''),
  }));

  const serializedPayload = JSON.stringify(canonicalRows);

  return createHmac('sha256', secret)
    .update(serializedPayload, 'utf8')
    .digest('hex');
}