import multer from 'multer';

export function studentUploadErrorMiddleware(err, req, res, next) {
  if (!(err instanceof multer.MulterError) && err?.statusCode !== 400) {
    return next(err);
  }

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        message: 'The XLSX file must not exceed 1 MB.',
      });
    }

    if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Upload exactly one XLSX file using the "file" field.',
      });
    }

    return res.status(400).json({
      success: false,
      message: 'The uploaded file could not be accepted.',
    });
  }

  return res.status(400).json({
    success: false,
    message: err.message || 'Invalid uploaded file.',
  });
}