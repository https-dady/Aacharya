import { recordAuditEvent } from '../services/audit/audit.service.js';

/**
 * Attach an audit record to the completed HTTP response.
 * The final status determines SUCCESS/FAILURE, so a controller failure
 * cannot be recorded as a successful operation merely because the
 * middleware ran before the controller.
 *
 * For operations that require audit persistence to be transactional with
 * the business operation, call recordAuditEvent from the service layer
 * instead; response-finish auditing is necessarily post-response/best-effort.
 */
export function auditEvent({
  action,
  resourceType,
  getResourceId,
  getMetadata,
} = {}) {
  if (typeof action !== 'string' || action.trim().length < 2) {
    throw new TypeError('Audit action is required.');
  }

  if (
    typeof resourceType !== 'string'
    || resourceType.trim().length < 2
  ) {
    throw new TypeError('Audit resourceType is required.');
  }

  if (getResourceId !== undefined && typeof getResourceId !== 'function') {
    throw new TypeError('getResourceId must be a function.');
  }

  if (getMetadata !== undefined && typeof getMetadata !== 'function') {
    throw new TypeError('getMetadata must be a function.');
  }

  return function auditEventMiddleware(req, res, next) {
    let resourceId;
    let metadata;

    try {
      resourceId = getResourceId
        ? getResourceId(req, res)
        : req.params?.id ?? null;
      metadata = getMetadata ? getMetadata(req, res) : undefined;
    } catch (error) {
      return next(error);
    }

    res.once('finish', () => {
      const actor = req.user;
      const outcome = res.statusCode >= 400
        ? 'FAILURE'
        : 'SUCCESS';

      void recordAuditEvent({
        actorId: actor?._id ?? actor?.id ?? null,
        actorRole: actor?.role ?? 'SYSTEM',
        action: action.trim(),
        resourceType: resourceType.trim(),
        resourceId: resourceId ?? null,
        outcome,
        requestId: req.id ?? req.requestId ?? null,
        metadata,
      }).catch((error) => {
        req.log?.error?.(
          { err: error, action, resourceType },
          'Failed to persist audit event after response completion',
        );
      });
    });

    return next();
  };
}

export default auditEvent;
