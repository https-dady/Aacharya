import { randomUUID } from 'node:crypto';
import path from 'node:path';

import {
  uploadBufferToCloudinary,
  deleteFromCloudinary,
} from './cloudinary-storage.service.js';

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

function createStorageError(statusCode, code, message) {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.code = code;
  error.expose = true;

  return error;
}

function normalizeRequiredId(value, fieldName) {
  const normalized = String(value ?? '').trim();

  if (!/^[a-f\d]{24}$/i.test(normalized)) {
    throw createStorageError(
      400,
      'INVALID_ATTACHMENT_SCOPE',
      `A valid ${fieldName} is required for attachment storage.`,
    );
  }

  return normalized.toLowerCase();
}

function normalizeFilename(filename) {
  const basename = path.basename(
    String(filename ?? '').replace(/\\/g, '/'),
  );

  const normalized = basename
    .normalize('NFKC')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/[^\p{L}\p{N}._() -]/gu, '_')
    .trim();

  if (
    !normalized
    || normalized === '.'
    || normalized === '..'
    || normalized.length > 255
  ) {
    throw createStorageError(
      400,
      'INVALID_ATTACHMENT_NAME',
      'The uploaded file has an invalid filename.',
    );
  }

  return normalized;
}

function validateFile(file) {
  if (!file || !Buffer.isBuffer(file.buffer)) {
    throw createStorageError(
      400,
      'INVALID_ATTACHMENT_BUFFER',
      'The uploaded file buffer is missing.',
    );
  }

  if (file.buffer.length === 0) {
    throw createStorageError(
      400,
      'EMPTY_ATTACHMENT',
      'Empty files cannot be uploaded.',
    );
  }

  if (file.buffer.length > MAX_FILE_SIZE_BYTES) {
    throw createStorageError(
      413,
      'ATTACHMENT_TOO_LARGE',
      'Each attachment must not exceed 10 MB.',
    );
  }

  const filename = normalizeFilename(file.originalname);
  const extension = path.extname(filename).toLowerCase();

  const mimeType = String(file.mimetype ?? '')
    .trim()
    .toLowerCase();

  if (
    !ALLOWED_EXTENSIONS.has(extension)
    || !ALLOWED_MIME_TYPES.has(mimeType)
  ) {
    throw createStorageError(
      415,
      'UNSUPPORTED_ATTACHMENT_TYPE',
      'Supported formats are PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX and TXT.',
    );
  }

  return {
    filename,
    extension,
    mimeType,
    size: file.buffer.length,
  };
}

function buildCloudinaryFolder({
  departmentId,
  assignmentId,
}) {
  return [
    'aacharya-lms',
    'assignments',
    departmentId,
    assignmentId,
  ].join('/');
}

function buildCloudinaryPublicId(filename, extension) {
  const originalBaseName = path.parse(filename).name;

  const safeBaseName = originalBaseName
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}_-]/gu, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);

  const uniquePrefix = randomUUID();

  // Raw Cloudinary assets retain the file extension in public_id.
  return `${uniquePrefix}-${safeBaseName || 'attachment'}${extension}`;
}

/**
 * Upload assignment attachments to Cloudinary.
 *
 * @param {Array<object>} files Multer memory-storage files.
 * @param {object} options Upload scope.
 * @param {string} options.departmentId Department MongoDB ID.
 * @param {string} options.assignmentId Assignment MongoDB ID.
 *
 * @returns {Promise<Array<object>>}
 * Each attachment contains its URL, filename, MIME type, size,
 * Cloudinary public ID, and resource type.
 */
export async function uploadAssignmentAttachments(
  files,
  {
    departmentId,
    assignmentId,
  } = {},
) {
  if (!Array.isArray(files)) {
    throw createStorageError(
      400,
      'INVALID_ATTACHMENT_LIST',
      'Attachments must be supplied as an array of uploaded files.',
    );
  }

  if (files.length === 0) {
    return [];
  }

  if (files.length > MAX_FILES_PER_REQUEST) {
    throw createStorageError(
      400,
      'ATTACHMENT_LIMIT_EXCEEDED',
      'You can upload at most 5 files in one request.',
    );
  }

  const normalizedDepartmentId = normalizeRequiredId(
    departmentId,
    'department ID',
  );

  const normalizedAssignmentId = normalizeRequiredId(
    assignmentId,
    'assignment ID',
  );

  const folder = buildCloudinaryFolder({
    departmentId: normalizedDepartmentId,
    assignmentId: normalizedAssignmentId,
  });

  const uploadedAssets = [];

  try {
    for (const file of files) {
      const metadata = validateFile(file);

      const publicId = buildCloudinaryPublicId(
        metadata.filename,
        metadata.extension,
      );

      const uploadResult = await uploadBufferToCloudinary(
        file.buffer,
        {
          folder,
          resourceType: 'raw',
          publicId,
          overwrite: false,
          tags: [
            'aacharya-lms',
            'assignment-attachment',
            `department-${normalizedDepartmentId}`,
            `assignment-${normalizedAssignmentId}`,
          ],
        },
      );

      uploadedAssets.push({
        name: metadata.filename,
        url: uploadResult.url,
        mimeType: metadata.mimeType,
        size: uploadResult.bytes,
        publicId: uploadResult.publicId,
        resourceType: uploadResult.resourceType || 'raw',
      });
    }

    return uploadedAssets;
  } catch (uploadError) {
    const cleanupResults = await Promise.allSettled(
      uploadedAssets.map((asset) => {
        if (!asset.publicId || !asset.resourceType) {
          return Promise.resolve();
        }

        return deleteFromCloudinary(asset.publicId, {
          resourceType: asset.resourceType,
          invalidate: true,
        });
      }),
    );

    const failedCleanupCount = cleanupResults.filter(
      (result) => result.status === 'rejected',
    ).length;

    if (failedCleanupCount > 0) {
      uploadError.cleanupWarning =
        `${failedCleanupCount} uploaded Cloudinary asset(s) could not be cleaned up.`;
    }

    throw uploadError;
  }
}

export const ASSIGNMENT_ATTACHMENT_LIMITS = Object.freeze({
  maxFileSizeBytes: MAX_FILE_SIZE_BYTES,
  maxFilesPerRequest: MAX_FILES_PER_REQUEST,
  allowedExtensions: [...ALLOWED_EXTENSIONS],
  allowedMimeTypes: [...ALLOWED_MIME_TYPES],
});