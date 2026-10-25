import { getCloudinary } from '../../config/cloudinary.js';

const DEFAULT_FOLDER = 'aacharya-lms';

const ALLOWED_RESOURCE_TYPES = new Set([
  'image',
  'raw',
  'video',
  'auto',
]);

function validateBuffer(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new TypeError(
      'A non-empty file buffer is required for upload.',
    );
  }
}

function validateFolder(folder) {
  if (typeof folder !== 'string' || !folder.trim()) {
    throw new TypeError('A valid Cloudinary folder is required.');
  }

  const normalized = folder.trim().replace(/^\/+|\/+$/g, '');

  if (
    normalized.split('/').some(
      (segment) =>
        !segment
        || segment === '.'
        || segment === '..',
    )
  ) {
    throw new TypeError('Invalid Cloudinary folder path.');
  }

  return normalized;
}

function validateResourceType(resourceType) {
  if (!ALLOWED_RESOURCE_TYPES.has(resourceType)) {
    throw new TypeError('Unsupported Cloudinary resource type.');
  }

  return resourceType;
}

function validatePublicId(publicId) {
  if (typeof publicId !== 'string' || !publicId.trim()) {
    throw new TypeError('A valid Cloudinary public ID is required.');
  }

  return publicId.trim();
}

function uploadBuffer(buffer, options) {
  const cloudinary = getCloudinary();

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        if (!result?.public_id || !result?.secure_url) {
          reject(
            new Error(
              'Cloudinary upload returned an incomplete response.',
            ),
          );
          return;
        }

        resolve({
          publicId: result.public_id,
          url: result.secure_url,
          resourceType: result.resource_type,
          format: result.format ?? null,
          bytes: result.bytes ?? buffer.length,
          width: result.width ?? null,
          height: result.height ?? null,
        });
      },
    );

    uploadStream.end(buffer);
  });
}

/**
 * Upload a Multer memory-storage file buffer to Cloudinary.
 *
 * This service does not validate the file's actual content.
 * Validate file type, size, and access permissions at the
 * request boundary before calling this function.
 */
export async function uploadBufferToCloudinary(
  buffer,
  {
    folder = DEFAULT_FOLDER,
    resourceType = 'auto',
    publicId,
    overwrite = false,
    tags,
  } = {},
) {
  validateBuffer(buffer);

  const normalizedFolder = validateFolder(folder);
  const normalizedResourceType = validateResourceType(resourceType);

  const options = {
    folder: normalizedFolder,
    resource_type: normalizedResourceType,
    overwrite: Boolean(overwrite),
  };

  if (publicId !== undefined) {
    if (typeof publicId !== 'string' || !publicId.trim()) {
      throw new TypeError('publicId must be a non-empty string.');
    }

    options.public_id = publicId.trim();
  }

  if (tags !== undefined) {
    if (
      !Array.isArray(tags)
      || tags.some(
        (tag) => typeof tag !== 'string' || !tag.trim(),
      )
    ) {
      throw new TypeError('tags must be an array of non-empty strings.');
    }

    options.tags = [...new Set(tags.map((tag) => tag.trim()))];
  }

  return uploadBuffer(buffer, options);
}

/**
 * Delete a Cloudinary asset using its public ID and resource type.
 *
 * Callers should persist the public ID and resource type returned
 * by the upload service so deletion targets the correct asset.
 */
export async function deleteFromCloudinary(
  publicId,
  { resourceType = 'image', invalidate = true } = {},
) {
  const normalizedPublicId = validatePublicId(publicId);
  const normalizedResourceType = validateResourceType(resourceType);

  if (normalizedResourceType === 'auto') {
    throw new TypeError(
      'The auto resource type cannot be used for asset deletion.',
    );
  }

  const cloudinary = getCloudinary();

  const result = await cloudinary.uploader.destroy(
    normalizedPublicId,
    {
      resource_type: normalizedResourceType,
      invalidate: Boolean(invalidate),
    },
  );

  if (!['ok', 'not found'].includes(result?.result)) {
    throw new Error(
      'Cloudinary asset deletion was not confirmed.',
    );
  }

  return {
    publicId: normalizedPublicId,
    result: result.result,
  };
}