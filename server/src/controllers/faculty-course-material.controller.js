import mongoose from 'mongoose';

import {
  User,
  USER_ROLES,
  ACCOUNT_STATUSES,
} from '../models/user.model.js';

import {
  Department,
} from '../models/department.model.js';

import {
  Course,
  COURSE_STATUSES,
} from '../models/course.model.js';

import {
  CourseMaterial,
  COURSE_MATERIAL_TYPES,
  COURSE_MATERIAL_STATUSES,
} from '../models/course-material.model.js';

import {
  uploadBufferToCloudinary,
  deleteFromCloudinary,
} from '../services/storage/cloudinary-storage.service.js';

import {
  hasUserRole,
} from '../utils/role-access.util.js';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 100;

function createControllerError(statusCode, code, message) {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.code = code;
  error.expose = true;

  return error;
}

function normalizeId(value) {
  if (!value) return null;

  return value._id
    ? value._id.toString()
    : value.toString();
}

function normalizeMaterial(material) {
  return {
    id: material._id.toString(),
    courseId: normalizeId(material.course),
    departmentId: normalizeId(material.department),
    uploadedBy: normalizeId(material.uploadedBy),

    title: material.title,
    description: material.description,
    moduleName: material.moduleName,
    type: material.type,
    status: material.status,

    file: material.file
      ? {
          originalName: material.file.originalName,
          url: material.file.url,
          resourceType: material.file.resourceType,
          format: material.file.format,
          mimeType: material.file.mimeType,
          size: material.file.size,
        }
      : null,

    resourceUrl: material.resourceUrl || '',

    createdAt: material.createdAt,
    updatedAt: material.updatedAt,
    archivedAt: material.archivedAt || null,
  };
}

/**
 * Retrieves the authenticated active teaching account.
 *
 * Supported roles:
 * FACULTY, MENTOR and HOD.
 *
 * Supports both legacy primary-role accounts and
 * multi-role accounts.
 */
async function getAuthenticatedTeachingUser(userId) {
  if (!mongoose.isValidObjectId(userId)) {
    throw createControllerError(
      401,
      'INVALID_AUTHENTICATED_USER',
      'A valid authenticated teaching account is required.',
    );
  }

  const teachingUser = await User.findOne({
    _id: userId,
    status: ACCOUNT_STATUSES.ACTIVE,

    $or: [
      {
        role: {
          $in: [
            USER_ROLES.FACULTY,
            USER_ROLES.MENTOR,
            USER_ROLES.HOD,
          ],
        },
      },
      {
        roles: {
          $in: [
            USER_ROLES.FACULTY,
            USER_ROLES.MENTOR,
            USER_ROLES.HOD,
          ],
        },
      },
    ],
  })
    .select('_id role roles department status')
    .lean()
    .exec();

  if (!teachingUser) {
    throw createControllerError(
      403,
      'TEACHING_ACCOUNT_UNAVAILABLE',
      'Your active Faculty, Mentor or HOD account could not be verified.',
    );
  }

  if (
    !hasUserRole(
      teachingUser,
      USER_ROLES.FACULTY,
      USER_ROLES.MENTOR,
      USER_ROLES.HOD,
    )
  ) {
    throw createControllerError(
      403,
      'TEACHING_ACCESS_FORBIDDEN',
      'Your account does not have teaching access.',
    );
  }

  if (!teachingUser.department) {
    throw createControllerError(
      403,
      'TEACHING_DEPARTMENT_UNAVAILABLE',
      'Your account is not assigned to a department.',
    );
  }

  // HOD must belong to the department they manage.
  if (hasUserRole(teachingUser, USER_ROLES.HOD)) {
    const department = await Department.findOne({
      _id: teachingUser.department,
      hod: teachingUser._id,
      status: 'ACTIVE',
    })
      .select('_id')
      .lean()
      .exec();

    if (!department) {
      throw createControllerError(
        403,
        'HOD_DEPARTMENT_UNAVAILABLE',
        'Your active HOD department assignment could not be verified.',
      );
    }
  }

  return teachingUser;
}

/**
 * Verifies that the authenticated teaching account
 * is assigned to the requested active course.
 *
 * The existing Course.faculty ownership relationship
 * remains the source of teaching assignment.
 */
async function getTeachingUserAssignedCourse(userId, courseId) {
  if (!mongoose.isValidObjectId(courseId)) {
    throw createControllerError(
      400,
      'INVALID_COURSE_ID',
      'A valid course ID is required.',
    );
  }

  const teachingUser = await getAuthenticatedTeachingUser(userId);

  const course = await Course.findOne({
    _id: courseId,
    faculty: teachingUser._id,
    department: teachingUser.department,
    status: COURSE_STATUSES.ACTIVE,
  })
    .select('_id department faculty title code status')
    .lean()
    .exec();

  if (!course) {
    throw createControllerError(
      404,
      'ASSIGNED_COURSE_NOT_FOUND',
      'The requested active course was not found in your assigned courses.',
    );
  }

  return {
    faculty: teachingUser,
    course,
  };
}

function normalizeResourceUrl(value) {
  if (typeof value !== 'string') {
    throw createControllerError(
      400,
      'INVALID_RESOURCE_URL',
      'A valid HTTP or HTTPS resource URL is required.',
    );
  }

  const trimmed = value.trim();

  let parsed;

  try {
    parsed = new URL(trimmed);
  } catch {
    throw createControllerError(
      400,
      'INVALID_RESOURCE_URL',
      'Provide a valid resource URL.',
    );
  }

  if (
    !['http:', 'https:'].includes(parsed.protocol)
    || !parsed.hostname.includes('.')
    || parsed.username
    || parsed.password
  ) {
    throw createControllerError(
      400,
      'INVALID_RESOURCE_URL',
      'Only valid HTTP and HTTPS resource URLs are supported.',
    );
  }

  return parsed.toString();
}

function resolvePagination(query = {}) {
  const page = Math.max(
    DEFAULT_PAGE,
    Number.parseInt(query.page, 10) || DEFAULT_PAGE,
  );

  const limit = Math.min(
    MAX_LIMIT,
    Math.max(
      1,
      Number.parseInt(query.limit, 10) || DEFAULT_LIMIT,
    ),
  );

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

/**
 * GET /api/v1/courses/:courseId/materials
 */
export async function listFacultyCourseMaterialsController(
  req,
  res,
  next,
) {
  try {
    await getTeachingUserAssignedCourse(
      req.user?.id,
      req.params.courseId,
    );

    const { page, limit, skip } = resolvePagination(req.query);

    const filter = {
      course: req.params.courseId,
      status: COURSE_MATERIAL_STATUSES.PUBLISHED,
    };

    if (req.query.type) {
      filter.type = req.query.type;
    }

    if (req.query.moduleName) {
      filter.moduleName = req.query.moduleName;
    }

    const [materials, total] = await Promise.all([
      CourseMaterial.find(filter)
        .sort({
          createdAt: -1,
          _id: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),

      CourseMaterial.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: 'Course materials retrieved successfully.',
      data: {
        items: materials.map(normalizeMaterial),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page * limit < total,
          hasPreviousPage: page > 1,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/v1/courses/:courseId/materials/:materialId
 */
export async function getFacultyCourseMaterialController(
  req,
  res,
  next,
) {
  try {
    await getTeachingUserAssignedCourse(
      req.user?.id,
      req.params.courseId,
    );

    if (!mongoose.isValidObjectId(req.params.materialId)) {
      throw createControllerError(
        400,
        'INVALID_MATERIAL_ID',
        'A valid material ID is required.',
      );
    }

    const material = await CourseMaterial.findOne({
      _id: req.params.materialId,
      course: req.params.courseId,
      status: COURSE_MATERIAL_STATUSES.PUBLISHED,
    })
      .lean()
      .exec();

    if (!material) {
      throw createControllerError(
        404,
        'COURSE_MATERIAL_NOT_FOUND',
        'The requested course material could not be found.',
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Course material retrieved successfully.',
      data: {
        material: normalizeMaterial(material),
      },
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /api/v1/courses/:courseId/materials
 */
export async function createFacultyCourseMaterialController(
  req,
  res,
  next,
) {
  let uploadedAsset = null;

  try {
    const { faculty, course } =
      await getTeachingUserAssignedCourse(
        req.user?.id,
        req.params.courseId,
      );

    const {
      title,
      description = '',
      moduleName,
      type,
      resourceUrl,
    } = req.body;

    const normalizedTitle = title.trim();
    const normalizedModuleName = moduleName.trim();

    let fileMetadata = null;
    let normalizedResourceUrl = '';

    if (type === COURSE_MATERIAL_TYPES.DOCUMENT) {
      if (!req.file?.buffer) {
        throw createControllerError(
          400,
          'MATERIAL_FILE_REQUIRED',
          'Select a document file to upload.',
        );
      }

      uploadedAsset = await uploadBufferToCloudinary(
        req.file.buffer,
        {
          folder: `aacharya-lms/course-materials/${course._id}`,
          resourceType: 'raw',
          tags: [
            'aacharya-lms',
            'course-material',
            course._id.toString(),
            faculty._id.toString(),
          ],
        },
      );

      fileMetadata = {
        originalName: req.file.originalname,
        url: uploadedAsset.url,
        publicId: uploadedAsset.publicId,
        resourceType: uploadedAsset.resourceType,
        format: uploadedAsset.format || '',
        mimeType: req.file.mimetype || '',
        size: uploadedAsset.bytes,
      };
    } else if (
      type === COURSE_MATERIAL_TYPES.VIDEO
      || type === COURSE_MATERIAL_TYPES.EXTERNAL
    ) {
      if (req.file) {
        throw createControllerError(
          400,
          'UNEXPECTED_MATERIAL_FILE',
          'Video and external resources must be submitted as URLs.',
        );
      }

      normalizedResourceUrl = normalizeResourceUrl(resourceUrl);
    } else {
      throw createControllerError(
        400,
        'INVALID_MATERIAL_TYPE',
        'Choose a supported course material type.',
      );
    }

    const material = new CourseMaterial({
      course: course._id,
      department: faculty.department,
      uploadedBy: faculty._id,
      title: normalizedTitle,
      description: description.trim(),
      moduleName: normalizedModuleName,
      type,
      file: fileMetadata,
      resourceUrl: normalizedResourceUrl,
      status: COURSE_MATERIAL_STATUSES.PUBLISHED,
    });

    await material.save();

    return res.status(201).json({
      success: true,
      message: 'Course material created successfully.',
      data: {
        material: normalizeMaterial(material),
      },
    });
  } catch (error) {
    if (uploadedAsset?.publicId) {
      try {
        await deleteFromCloudinary(
          uploadedAsset.publicId,
          {
            resourceType: uploadedAsset.resourceType,
          },
        );
      } catch (cleanupError) {
        req.log?.error(
          {
            err: cleanupError,
            publicId: uploadedAsset.publicId,
          },
          'Failed to clean up an uploaded course material asset.',
        );
      }
    }

    return next(error);
  }
}

/**
 * PATCH /api/v1/courses/:courseId/materials/:materialId/archive
 */
export async function archiveFacultyCourseMaterialController(
  req,
  res,
  next,
) {
  try {
    await getTeachingUserAssignedCourse(
      req.user?.id,
      req.params.courseId,
    );

    if (!mongoose.isValidObjectId(req.params.materialId)) {
      throw createControllerError(
        400,
        'INVALID_MATERIAL_ID',
        'A valid material ID is required.',
      );
    }

    const material = await CourseMaterial.findOneAndUpdate(
      {
        _id: req.params.materialId,
        course: req.params.courseId,
        status: COURSE_MATERIAL_STATUSES.PUBLISHED,
      },
      {
        $set: {
          status: COURSE_MATERIAL_STATUSES.ARCHIVED,
          archivedAt: new Date(),
        },
      },
      {
        new: true,
        runValidators: true,
      },
    )
      .lean()
      .exec();

    if (!material) {
      throw createControllerError(
        404,
        'PUBLISHED_COURSE_MATERIAL_NOT_FOUND',
        'The published course material could not be found.',
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Course material archived successfully.',
      data: {
        material: normalizeMaterial(material),
      },
    });
  } catch (error) {
    return next(error);
  }
}