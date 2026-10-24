import multer from 'multer';

const MAX_FILE_SIZE = 1024 * 1024;

const studentUpload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
    fields: 0,
    parts: 1,
  },

  fileFilter(req, file, callback) {
    const originalName = file.originalname || '';

    if (!/\.xlsx$/i.test(originalName)) {
      const error = new Error('Only .xlsx files are allowed.');
      error.statusCode = 400;

      return callback(error);
    }

    callback(null, true);
  },
});

export default studentUpload;