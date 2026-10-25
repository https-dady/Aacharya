import AuditEvent, {
  AUDIT_ACTORS,
  AUDIT_OUTCOMES,
} from '../../models/audit-event.model.js';

const SENSITIVE_KEY_PATTERN =
  /password|passwd|secret|token|authorization|cookie|credential|api.?key|private.?key/i;

const MAX_METADATA_DEPTH = 5;
const MAX_METADATA_ENTRIES = 50;
const MAX_METADATA_STRING_LENGTH = 1000;

function sanitizeMetadataValue(value, depth, budget) {
  if (depth > MAX_METADATA_DEPTH || budget.remaining <= 0) {
    return '[REDACTED]';
  }

  budget.remaining -= 1;

  if (value === null || typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    return value.slice(0, MAX_METADATA_STRING_LENGTH);
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_METADATA_ENTRIES)
      .map((item) =>
        sanitizeMetadataValue(item, depth + 1, budget),
      );
  }

  if (
    typeof value !== 'object'
    || Object.getPrototypeOf(value) !== Object.prototype
  ) {
    return '[UNSUPPORTED_VALUE]';
  }

  const sanitized = {};

  for (
    const [key, nestedValue] of Object.entries(value)
      .slice(0, MAX_METADATA_ENTRIES)
  ) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      sanitized[key] = '[REDACTED]';
      continue;
    }

    sanitized[key] = sanitizeMetadataValue(
      nestedValue,
      depth + 1,
      budget,
    );
  }

  return sanitized;
}

export function sanitizeAuditMetadata(metadata) {
  if (metadata === undefined || metadata === null) {
    return undefined;
  }

  if (
    typeof metadata !== 'object'
    || Array.isArray(metadata)
    || Object.getPrototypeOf(metadata) !== Object.prototype
  ) {
    throw new TypeError(
      'Audit metadata must be a plain object.',
    );
  }

  return sanitizeMetadataValue(
    metadata,
    0,
    { remaining: MAX_METADATA_ENTRIES },
  );
}

function normalizeOptionalString(value, fieldName, maxLength) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new TypeError(`${fieldName} must be a string.`);
  }

  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  return normalized.slice(0, maxLength);
}

/**
 * Persist a sanitized audit event.
 *
 * The caller remains responsible for choosing an accurate action,
 * actor role, resource type, and outcome.
 *
 * Audit persistence errors intentionally propagate to the caller.
 * Callers must decide whether an audit failure should block their
 * operation; security-sensitive actions should not silently discard
 * audit failures.
 */
export async function recordAuditEvent({
  actorId = null,
  actorRole = 'SYSTEM',
  action,
  resourceType,
  resourceId = null,
  outcome,
  requestId = null,
  metadata,
} = {}) {
  if (!AUDIT_ACTORS.includes(actorRole)) {
    throw new TypeError('Unsupported audit actor role.');
  }

  if (!AUDIT_OUTCOMES.includes(outcome)) {
    throw new TypeError('Unsupported audit outcome.');
  }

  if (typeof action !== 'string' || !action.trim()) {
    throw new TypeError('Audit action is required.');
  }

  if (
    typeof resourceType !== 'string'
    || !resourceType.trim()
  ) {
    throw new TypeError('Audit resource type is required.');
  }

  const normalizedResourceId = normalizeOptionalString(
    resourceId,
    'resourceId',
    150,
  );

  const normalizedRequestId = normalizeOptionalString(
    requestId,
    'requestId',
    150,
  );

  const sanitizedMetadata = sanitizeAuditMetadata(metadata);

  const event = {
    actorRole,
    action: action.trim(),
    resourceType: resourceType.trim(),
    outcome,
  };

  if (actorId !== null && actorId !== undefined) {
    event.actorId = actorId;
  }

  if (normalizedResourceId) {
    event.resourceId = normalizedResourceId;
  }

  if (normalizedRequestId) {
    event.requestId = normalizedRequestId;
  }

  if (sanitizedMetadata !== undefined) {
    event.metadata = sanitizedMetadata;
  }

  return AuditEvent.create(event);
}