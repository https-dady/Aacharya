export function validateRequest(schema) {
  return function requestValidationMiddleware(req, res, next) {
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

      return next(error);
    }

    res.locals.validatedRequest = result.data;

    return next();
  };
}

// Backward-compatible alias for existing routes.
export const validate = (schema) => {
  return function validateRequestMiddleware(req, res, next) {
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

      return next(error);
    }

    req.body = result.data.body ?? req.body;

    return next();
  };
}