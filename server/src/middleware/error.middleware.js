function createErrorResponse(code, message) {
  return {
    success: false,
    error: {
      code,
      message,
    },
  };
}

export function notFoundHandler(req, res, next) {
  const error = new Error('The requested resource was not found.');

  error.statusCode = 404;
  error.code = 'NOT_FOUND';

  next(error);
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    next(error);
    return;
  }

  const statusCode = Number(error.statusCode ?? error.status);

  const isValidStatusCode =
    Number.isInteger(statusCode) &&
    statusCode >= 400 &&
    statusCode <= 599;

  const resolvedStatusCode = isValidStatusCode ? statusCode : 500;

  let code = 'INTERNAL_SERVER_ERROR';
  let message = 'An unexpected error occurred.';

  if (resolvedStatusCode === 400) {
    code = 'BAD_REQUEST';
    message = 'The request could not be processed.';
  } else if (resolvedStatusCode === 401) {
    code = 'UNAUTHORIZED';
    message = 'Authentication is required.';
  } else if (resolvedStatusCode === 403) {
    code = 'FORBIDDEN';
    message = 'You do not have permission to perform this action.';
  } else if (resolvedStatusCode === 404) {
    code = 'NOT_FOUND';
    message = 'The requested resource was not found.';
  } else if (resolvedStatusCode === 409) {
    code = 'CONFLICT';
    message = 'The request conflicts with the current resource state.';
  } else if (resolvedStatusCode === 413) {
    code = 'PAYLOAD_TOO_LARGE';
    message = 'The request payload exceeds the permitted size.';
  } else if (resolvedStatusCode === 422) {
    code = 'VALIDATION_ERROR';
    message = 'The request contains invalid data.';
  } else if (resolvedStatusCode === 429) {
    code = 'TOO_MANY_REQUESTS';
    message = 'Too many requests. Please try again later.';
  }

  if (
    resolvedStatusCode < 500 &&
    typeof error.code === 'string' &&
    error.code.trim() !== ''
  ) {
    code = error.code;
  }

  if (
    resolvedStatusCode < 500 &&
    error.expose === true &&
    typeof error.message === 'string'
  ) {
    message = error.message;
  }

  if (resolvedStatusCode >= 500) {
    req.log?.error(
      {
        err: error,
        statusCode: resolvedStatusCode,
      },
      'Request failed',
    );
  }

  res.status(resolvedStatusCode).json(
    createErrorResponse(code, message),
  );
}