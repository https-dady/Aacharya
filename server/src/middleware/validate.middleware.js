export function validate(schema) {
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

      return next(error);
    }

    // Express request properties are not overwritten.
    // Use validated body data for downstream handlers.
    req.body = result.data.body ?? req.body;

    return next();
  };
}