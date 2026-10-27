import multer from 'multer';

const MAX_FILE_SIZE = 1024 * 1024;

const XLSX_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const studentUpload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
    fields: 0,
    parts: 1,
  },

  fileFilter(req, file, callback) {
    const originalName =
      typeof file.originalname === 'string'
        ? file.originalname.trim()
        : '';

    const mimeType =
      typeof file.mimetype === 'string'
        ? file.mimetype.trim().toLowerCase()
        : '';

    if (!/^[^/\\]+\.xlsx$/i.test(originalName)) {
      const error = new Error(
        'Only .xlsx files are allowed.',
      );

      error.statusCode = 400;
      error.code = 'INVALID_FILE_EXTENSION';

      return callback(error);
    }

    if (mimeType !== XLSX_MIME_TYPE) {
      const error = new Error(
        'The uploaded file must use the XLSX file format.',
      );

      error.statusCode = 400;
      error.code = 'INVALID_FILE_TYPE';

      return callback(error);
    }

    return callback(null, true);
  },
});

export default studentUpload;