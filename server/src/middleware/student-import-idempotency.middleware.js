import {
  validateIdempotencyKey,
  StudentImportIdempotencyError,
} from '../services/provisioning/student-import-idempotency.service.js';

export function studentImportIdempotencyMiddleware(
  req,
  res,
  next,
) {
  try {
    const idempotencyKey = validateIdempotencyKey(
      req.get('Idempotency-Key'),
    );

    req.idempotencyKey = idempotencyKey;

    return next();
  } catch (error) {
    if (error instanceof StudentImportIdempotencyError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        code: error.code,
      });
    }

    return next(error);
  }
}