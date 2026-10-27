function createErrorResponse(code, message, details) {
  const error = {
    code,
    message,
  };

  if (Array.isArray(details) && details.length > 0) {
    error.details = details;
  }

  return {
    success: false,
    error,
  };
}

function resolveErrorStatus(error) {
  // MongoDB duplicate-key error.
  if (error?.code === 11000) {
    return 409;
  }

  // Mongoose document validation error.
  if (error?.name === 'ValidationError') {
    return 422;
  }

  // Invalid MongoDB document ID or cast operation.
  if (error?.name === 'CastError') {
    return 400;
  }

  const statusCode = Number(error?.statusCode ?? error?.status);

  if (
    Number.isInteger(statusCode) &&
    statusCode >= 400 &&
    statusCode <= 599
  ) {
    return statusCode;
  }

  return 500;
}

function resolveErrorCode(statusCode, error) {
  if (
    statusCode < 500 &&
    typeof error?.code === 'string' &&
    error.code.trim() !== ''
  ) {
    return error.code;
  }

  switch (statusCode) {
    case 400:
      return 'BAD_REQUEST';

    case 401:
      return 'UNAUTHORIZED';

    case 403:
      return 'FORBIDDEN';

    case 404:
      return 'NOT_FOUND';

    case 409:
      return 'CONFLICT';

    case 413:
      return 'PAYLOAD_TOO_LARGE';

    case 422:
      return 'VALIDATION_ERROR';

    case 429:
      return 'TOO_MANY_REQUESTS';

    default:
      return 'INTERNAL_SERVER_ERROR';
  }
}

function resolveErrorMessage(statusCode, error) {
  if (
    statusCode < 500 &&
    error?.expose === true &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }

  switch (statusCode) {
    case 400:
      return 'The request could not be processed.';

    case 401:
      return 'Authentication is required.';

    case 403:
      return 'You do not have permission to perform this action.';

    case 404:
      return 'The requested resource was not found.';

    case 409:
      return 'The request conflicts with the current resource state.';

    case 413:
      return 'The request payload exceeds the permitted size.';

    case 422:
      return 'The request contains invalid data.';

    case 429:
      return 'Too many requests. Please try again later.';

    default:
      return 'An unexpected error occurred.';
  }
}

function resolveValidationDetails(statusCode, error) {
  if (statusCode !== 422 || !Array.isArray(error?.details)) {
    return undefined;
  }

  return error.details
    .filter(
      (detail) =>
        detail &&
        typeof detail.path === 'string' &&
        typeof detail.message === 'string',
    )
    .slice(0, 50)
    .map((detail) => ({
      path: detail.path.slice(0, 200),
      message: detail.message.slice(0, 500),
    }));
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

  const statusCode = resolveErrorStatus(error);
  const code = resolveErrorCode(statusCode, error);
  const message = resolveErrorMessage(statusCode, error);
  const details = resolveValidationDetails(statusCode, error);

  if (statusCode >= 500) {
    req.log?.error(
      {
        err: error,
        statusCode,
      },
      'Request failed',
    );
  }

  res.status(statusCode).json(
    createErrorResponse(code, message, details),
  );
}