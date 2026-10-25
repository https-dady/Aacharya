const registeredJobs = new Map();

const JOB_NAME_PATTERN = /^[a-z][a-z0-9._-]{2,99}$/;

function createJobError(message, code, statusCode = 400) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;

  return error;
}

function validateJobName(name) {
  if (typeof name !== 'string' || !JOB_NAME_PATTERN.test(name)) {
    throw createJobError(
      'Job name must be 3–100 characters and use lowercase letters, numbers, dots, underscores or hyphens.',
      'INVALID_JOB_NAME',
    );
  }
}

function validateHandler(handler) {
  if (typeof handler !== 'function') {
    throw createJobError(
      'Job handler must be a function.',
      'INVALID_JOB_HANDLER',
    );
  }
}

/**
 * Register a trusted, application-defined job handler.
 *
 * Registration must happen during application initialization.
 * Do not expose this operation directly through an HTTP endpoint.
 */
export function registerJob(name, handler) {
  validateJobName(name);
  validateHandler(handler);

  if (registeredJobs.has(name)) {
    throw createJobError(
      `A job handler is already registered for "${name}".`,
      'JOB_ALREADY_REGISTERED',
      409,
    );
  }

  registeredJobs.set(name, handler);

  return () => {
    if (registeredJobs.get(name) === handler) {
      registeredJobs.delete(name);
    }
  };
}

/**
 * Execute a registered handler.
 *
 * This is an execution interface, not a durable queue.
 * It does not provide persistence, retries, scheduling or distributed
 * locking. Those capabilities require a separately selected job adapter.
 */
export async function executeJob(name, payload = {}) {
  validateJobName(name);

  const handler = registeredJobs.get(name);

  if (!handler) {
    throw createJobError(
      `No job handler is registered for "${name}".`,
      'JOB_HANDLER_NOT_FOUND',
      404,
    );
  }

  if (
    payload === null ||
    typeof payload !== 'object' ||
    Array.isArray(payload)
  ) {
    throw createJobError(
      'Job payload must be an object.',
      'INVALID_JOB_PAYLOAD',
    );
  }

  return handler(payload);
}

/**
 * Return registered job names without exposing handler implementations.
 */
export function listRegisteredJobs() {
  return [...registeredJobs.keys()].sort();
}

/**
 * Remove a registered handler during controlled application teardown
 * or in isolated tests.
 */
export function unregisterJob(name) {
  validateJobName(name);

  return registeredJobs.delete(name);
}

export default {
  registerJob,
  executeJob,
  listRegisteredJobs,
  unregisterJob,
};