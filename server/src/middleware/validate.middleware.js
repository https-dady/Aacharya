/**
 * Validate request body, route parameters, and query parameters using Zod.
 *
 * The parsed result is exposed through req.validated so downstream
 * handlers can consume validated and transformed values without
 * overwriting Express-managed request properties.
 */
export function validate(schema) {
  if (!schema || typeof schema.safeParse !== 'function') {
    throw new TypeError(
      'Validation middleware requires a Zod-compatible schema.',
    );
  }

  return function validateRequest(req, res, next) {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (!result.success) {
      const error = new Error('The request contains invalid data.');

      error.statusCode = 422;
      error.code = 'VALIDATION_ERROR';
      error.expose = true;

      error.details = result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));

      return next(error);
    }

    req.validated = Object.freeze({
      body: result.data.body ?? req.body,
      params: result.data.params ?? req.params,
      query: result.data.query ?? req.query,
    });

    // Preserve compatibility with existing controllers that consume
    // validated request bodies.
    req.body = req.validated.body;

    return next();
  };
}