import multer from 'multer';

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.doc',
  '.docx',
  '.ppt',
  '.pptx',
  '.xls',
  '.xlsx',
  '.txt',
]);

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
]);

function getExtension(filename) {
  const normalized = String(filename || '').toLowerCase();
  const lastDot = normalized.lastIndexOf('.');

  return lastDot >= 0
    ? normalized.slice(lastDot)
    : '';
}

function createUploadError(statusCode, code, message) {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.code = code;
  error.expose = true;

  return error;
}

function fileFilter(_req, file, callback) {
  const extension = getExtension(file.originalname);

  if (!ALLOWED_EXTENSIONS.has(extension)) {
    callback(
      createUploadError(
        415,
        'UNSUPPORTED_MATERIAL_FILE_EXTENSION',
        'Unsupported file extension. Allowed formats: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX and TXT.',
      ),
    );

    return;
  }

  const mimeType = String(file.mimetype || '').toLowerCase();

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    callback(
      createUploadError(
        415,
        'UNSUPPORTED_MATERIAL_FILE_TYPE',
        'The uploaded document has an unsupported content type.',
      ),
    );

    return;
  }

  callback(null, true);
}

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 1,
    fields: 10,
    fieldSize: 1024 * 1024,
    parts: 12,
  },

  fileFilter,
});

/**
 * Accept one document using the multipart field name "file".
 *
 * Video and external resources do not use this middleware;
 * they are submitted through their resource URL.
 */
export const courseMaterialUpload = upload.single('file');

export const COURSE_MATERIAL_UPLOAD_LIMITS = Object.freeze({
  maxFileSizeBytes: MAX_FILE_SIZE_BYTES,
  maxFilesPerRequest: 1,
  allowedExtensions: [...ALLOWED_EXTENSIONS],
  allowedMimeTypes: [...ALLOWED_MIME_TYPES],
  fieldName: 'file',
});