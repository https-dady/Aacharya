import {
  User,
  ACCOUNT_STATUSES,
} from '../models/user.model.js';

import {
  verifyAccessToken,
} from '../services/auth/token.service.js';

import AuditEvent, {
  AUDIT_ACTORS,
  AUDIT_OUTCOMES,
} from '../models/audit-event.model.js';

const AUDIT_ACTOR_SET = new Set(AUDIT_ACTORS);
const AUDIT_OUTCOME_SET = new Set(AUDIT_OUTCOMES);

function createAuthError(statusCode, code, message) {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.code = code;
  error.expose = true;

  return error;
}

export async function authenticate(req, res, next) {
  const authorization = req.get('authorization');

  if (!authorization) {
    return next(
      createAuthError(
        401,
        'UNAUTHORIZED',
        'Authentication is required.',
      ),
    );
  }

  const [scheme, token, ...extraParts] = authorization
    .trim()
    .split(/\s+/);

  if (
    scheme?.toLowerCase() !== 'bearer'
    || !token
    || extraParts.length > 0
  ) {
    return next(
      createAuthError(
        401,
        'INVALID_TOKEN',
        'A valid access token is required.',
      ),
    );
  }

  let payload;

  try {
    payload = verifyAccessToken(token);
  } catch {
    return next(
      createAuthError(
        401,
        'INVALID_TOKEN',
        'The access token is invalid or expired.',
      ),
    );
  }

  try {
    const user = await User.findById(payload.userId)
      .select('_id role status isEmailVerified +tokenVersion')
      .lean()
      .exec();

    if (!user) {
      return next(
        createAuthError(
          401,
          'ACCOUNT_NOT_FOUND',
          'The account associated with this token no longer exists.',
        ),
      );
    }

    if (user.status !== ACCOUNT_STATUSES.ACTIVE) {
      return next(
        createAuthError(
          403,
          'ACCOUNT_INACTIVE',
          'Your account is suspended or disabled.',
        ),
      );
    }

    const currentTokenVersion = user.tokenVersion ?? 0;
    const accessTokenVersion = payload.tokenVersion ?? 0;

    if (accessTokenVersion !== currentTokenVersion) {
      return next(
        createAuthError(
          401,
          'TOKEN_REVOKED',
          'Your session is no longer valid. Please log in again.',
        ),
      );
    }

    req.user = {
      id: user._id.toString(),
      _id: user._id.toString(),
      role: user.role,
      isEmailVerified: user.isEmailVerified === true,
    };

    return next();
  } catch (error) {
    return next(error);
  }
}

function resolveValue(resolver, req) {
  if (typeof resolver !== 'function') {
    return undefined;
  }

  try {
    return resolver(req);
  } catch {
    return undefined;
  }
}

function normalizeResourceId(value) {
  if (
    typeof value !== 'string'
    && typeof value !== 'number'
    && typeof value !== 'bigint'
  ) {
    return null;
  }

  const normalized = String(value).trim();

  return normalized
    ? normalized.slice(0, 150)
    : null;
}

function normalizeMetadata(value) {
  if (
    value === null
    || typeof value !== 'object'
    || Array.isArray(value)
  ) {
    return undefined;
  }

  try {
    const serialized = JSON.stringify(value);

    if (!serialized || serialized.length > 10000) {
      return undefined;
    }

    return JSON.parse(serialized);
  } catch {
    return undefined;
  }
}

function getRequestId(req) {
  const requestId = req.id
    ?? req.get?.('x-request-id');

  if (
    typeof requestId !== 'string'
    && typeof requestId !== 'number'
  ) {
    return null;
  }

  const normalized = String(requestId).trim();

  return normalized
    ? normalized.slice(0, 150)
    : null;
}

function getActor(req) {
  const actorId = req.user?.id ?? req.user?._id;
  const actorRole = req.user?.role;

  return {
    actorId: actorId || null,
    actorRole: AUDIT_ACTOR_SET.has(actorRole)
      ? actorRole
      : 'SYSTEM',
  };
}

async function persistAuditEvent({
  req,
  action,
  resourceType,
  getResourceId,
  getMetadata,
  outcome,
}) {
  const actor = getActor(req);

  const resourceId = normalizeResourceId(
    resolveValue(getResourceId, req)
      ?? req.params?.id
      ?? req.params?.studentId
      ?? null,
  );

  const metadata = normalizeMetadata(
    resolveValue(getMetadata, req),
  );

  const event = {
    ...actor,
    action,
    resourceType,
    resourceId,
    outcome,
    requestId: getRequestId(req),
  };

  if (metadata !== undefined) {
    event.metadata = metadata;
  }

  return AuditEvent.create(event);
}

export function auditEvent({
  action,
  resourceType,
  getResourceId,
  getMetadata,
} = {}) {
  if (
    typeof action !== 'string'
    || action.trim().length < 2
    || action.trim().length > 120
  ) {
    throw new TypeError(
      'auditEvent action is required and must be valid.',
    );
  }

  if (
    typeof resourceType !== 'string'
    || resourceType.trim().length < 2
    || resourceType.trim().length > 100
  ) {
    throw new TypeError(
      'auditEvent resourceType is required and must be valid.',
    );
  }

  if (
    getResourceId !== undefined
    && typeof getResourceId !== 'function'
  ) {
    throw new TypeError(
      'getResourceId must be a function when provided.',
    );
  }

  if (
    getMetadata !== undefined
    && typeof getMetadata !== 'function'
  ) {
    throw new TypeError(
      'getMetadata must be a function when provided.',
    );
  }

  return function auditEventMiddleware(req, res, next) {
    let recorded = false;

    res.once('finish', () => {
      if (recorded) {
        return;
      }

      recorded = true;

      const outcome = res.statusCode >= 400
        ? 'FAILURE'
        : 'SUCCESS';

      if (!AUDIT_OUTCOME_SET.has(outcome)) {
        return;
      }

      void persistAuditEvent({
        req,
        action: action.trim(),
        resourceType: resourceType.trim(),
        getResourceId,
        getMetadata,
        outcome,
      }).catch((error) => {
        if (
          req.log
          && typeof req.log.error === 'function'
        ) {
          req.log.error(
            {
              err: error,
              auditAction: action,
              requestId: getRequestId(req),
            },
            'Failed to persist audit event.',
          );
        }
      });
    });

    return next();
  };
}