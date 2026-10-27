import multer from 'multer';

function createUploadError(statusCode, code, message) {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.code = code;
  error.expose = true;

  return error;
}

export function studentUploadErrorMiddleware(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(
        createUploadError(
          413,
          'PAYLOAD_TOO_LARGE',
          'The XLSX file must not exceed 1 MB.',
        ),
      );
    }

    if (
      err.code === 'LIMIT_FILE_COUNT'
      || err.code === 'LIMIT_UNEXPECTED_FILE'
    ) {
      return next(
        createUploadError(
          400,
          'INVALID_FILE_UPLOAD',
          'Upload exactly one XLSX file using the "file" field.',
        ),
      );
    }

    return next(
      createUploadError(
        400,
        'INVALID_FILE_UPLOAD',
        'The uploaded file could not be accepted.',
      ),
    );
  }

  if (err?.statusCode === 400) {
    return next(err);
  }

  return next(err);
}