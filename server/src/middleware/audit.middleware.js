import { recordAuditEvent } from '../services/audit/audit.service.js';

import { AUDIT_OUTCOMES } from '../models/audit-event.model.js';

const VALID_OUTCOMES = new Set(AUDIT_OUTCOMES);

/**
 * Records an audit event before allowing the request to continue.
 *
 * IMPORTANT:
 * The configured outcome describes the event being recorded.
 * Since this middleware executes before the route handler, use it
 * only when the outcome is already known. Do not use it to claim
 * that a future controller operation has succeeded.
 *
 * Audit persistence failures are forwarded to centralized error
 * handling, preventing the protected operation from continuing.
 */
export function auditEvent({
  action,
  resourceType,
  outcome = 'SUCCESS',
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
    throw new TypeError(
      `Audit outcome must be one of: ${[...VALID_OUTCOMES].join(', ')}.`,
    );
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

        return next(error);
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
      return next(error);
    }
  };
}

export default auditEvent;