import multer from 'multer';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_FILES_PER_REQUEST = 5;

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

  return lastDot >= 0 ? normalized.slice(lastDot) : '';
}

function isAllowedFile(file) {
  const extension = getExtension(file.originalname);

  return (
    ALLOWED_EXTENSIONS.has(extension)
    && ALLOWED_MIME_TYPES.has(file.mimetype)
  );
}

function fileFilter(_req, file, callback) {
  if (!isAllowedFile(file)) {
    const error = new Error(
      'Unsupported file type. Allowed formats: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX and TXT.',
    );

    error.statusCode = 415;
    error.code = 'UNSUPPORTED_ATTACHMENT_TYPE';
    error.expose = true;

    callback(error);
    return;
  }

  callback(null, true);
}

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: MAX_FILES_PER_REQUEST,
    fields: 30,
    fieldSize: 1024 * 1024,
    parts: 40,
  },
  fileFilter,
});

export const assignmentUpload = upload.array(
  'attachments',
  MAX_FILES_PER_REQUEST,
);

export const ASSIGNMENT_UPLOAD_LIMITS = Object.freeze({
  maxFileSizeBytes: MAX_FILE_SIZE_BYTES,
  maxFilesPerRequest: MAX_FILES_PER_REQUEST,
  allowedExtensions: [...ALLOWED_EXTENSIONS],
  allowedMimeTypes: [...ALLOWED_MIME_TYPES],
});