const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function createValidationError(message, field) {
  const error = new Error(message);
  error.statusCode = 400;
  error.code = 'INVALID_PAGINATION';
  error.field = field;

  return error;
}

function parsePositiveInteger(value, field, defaultValue) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  let parsed;

  if (typeof value === 'number') {
    parsed = value;
  } else if (typeof value === 'string' && /^[1-9]\d*$/.test(value)) {
    parsed = Number(value);
  } else {
    throw createValidationError(
      `${field} must be a positive integer.`,
      field,
    );
  }

  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw createValidationError(
      `${field} must be a positive integer.`,
      field,
    );
  }

  return parsed;
}

/**
 * Normalize and validate pagination parameters.
 *
 * Supports:
 *   const pagination = parsePagination(req.query);
 *
 * Returns:
 *   { page, limit, skip }
 */
export function parsePagination(query = {}) {
  if (!query || typeof query !== 'object' || Array.isArray(query)) {
    throw createValidationError(
      'Pagination parameters must be an object.',
      'query',
    );
  }

  const page = parsePositiveInteger(
    query.page,
    'page',
    DEFAULT_PAGE,
  );

  const requestedLimit = parsePositiveInteger(
    query.limit,
    'limit',
    DEFAULT_LIMIT,
  );

  const limit = Math.min(requestedLimit, MAX_LIMIT);
  const skip = (page - 1) * limit;

  if (!Number.isSafeInteger(skip)) {
    throw createValidationError(
      'The requested page is too large.',
      'page',
    );
  }

  return {
    page,
    limit,
    skip,
  };
}

/**
 * Generate consistent pagination metadata.
 */
export function createPaginationMetadata({
  page,
  limit,
  total,
}) {
  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    !Number.isSafeInteger(total) ||
    total < 0
  ) {
    throw createValidationError(
      'Invalid pagination metadata.',
      'pagination',
    );
  }

  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1 && totalPages > 0,
  };
}

export default {
  parsePagination,
  createPaginationMetadata,
};