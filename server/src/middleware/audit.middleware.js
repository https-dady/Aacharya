import { recordAuditEvent } from '../services/audit/audit.service.js';

const VALID_OUTCOMES = new Set([
  'success',
  'failure',
]);

/**
 * Record an audit event without allowing audit failures to disappear silently.
 *
 * Use this middleware only on routes where the audit event's meaning and
 * outcome are known. Authentication and authorization must happen before
 * recording an event that depends on the authenticated actor.
 */
export function auditEvent({
  action,
  resourceType,
  outcome = 'success',
  getResourceId,
  getMetadata,
} = {}) {
  if (typeof action !== 'string' || !action.trim()) {
    throw new TypeError('Audit action is required.');
  }

  if (typeof resourceType !== 'string' || !resourceType.trim()) {
    throw new TypeError('Audit resourceType is required.');
  }

  if (!VALID_OUTCOMES.has(outcome)) {
    throw new TypeError('Audit outcome must be success or failure.');
  }

  if (
    getResourceId !== undefined
    && typeof getResourceId !== 'function'
  ) {
    throw new TypeError('getResourceId must be a function.');
  }

  if (
    getMetadata !== undefined
    && typeof getMetadata !== 'function'
  ) {
    throw new TypeError('getMetadata must be a function.');
  }

  return async function auditEventMiddleware(req, res, next) {
    try {
      const actor = req.user;

      if (!actor?._id || !actor?.role) {
        const error = new Error(
          'Authenticated actor context is required for this audit event.',
        );
        error.statusCode = 401;
        error.code = 'AUDIT_ACTOR_REQUIRED';

        throw error;
      }

      const resourceId = getResourceId
        ? getResourceId(req, res)
        : req.params?.id ?? null;

      const metadata = getMetadata
        ? getMetadata(req, res)
        : undefined;

      await recordAuditEvent({
        actorId: actor._id,
        actorRole: actor.role,
        action: action.trim(),
        resourceType: resourceType.trim(),
        resourceId: resourceId ?? null,
        outcome,
        requestId: req.id ?? req.requestId ?? null,
        metadata,
      });

      return next();
    } catch (error) {
      // Fail closed: if this route requires an audit record, do not
      // continue the operation when the audit event cannot be persisted.
      return next(error);
    }
  };
}

export default auditEvent;