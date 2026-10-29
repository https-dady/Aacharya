import mongoose from 'mongoose';

import {
  User,
  USER_ROLES,
  ACCOUNT_STATUSES,
} from '../models/user.model.js';

import { Department } from '../models/department.model.js';

import { hashPassword } from '../services/auth/password.service.js';

function createError(statusCode, code, message) {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.code = code;

  return error;
}

async function getActiveHodDepartment(userId) {
  if (!userId || !mongoose.isValidObjectId(userId)) {
    throw createError(
      401,
      'UNAUTHORIZED',
      'A valid authenticated account is required.',
    );
  }

  const hod = await User.findById(userId)
    .select('role status department')
    .exec();

  if (!hod) {
    throw createError(
      401,
      'UNAUTHORIZED',
      'The authenticated account was not found.',
    );
  }

  if (
    hod.status !== ACCOUNT_STATUSES.ACTIVE
    || hod.role !== USER_ROLES.HOD
  ) {
    throw createError(
      403,
      'FORBIDDEN',
      'Only an active HOD can manage faculty accounts.',
    );
  }

  if (!hod.department) {
    throw createError(
      409,
      'DEPARTMENT_NOT_ASSIGNED',
      'The HOD is not assigned to a department.',
    );
  }

  const department = await Department.findOne({
    _id: hod.department,
    hod: hod._id,
    status: 'ACTIVE',
  })
    .select('_id name code')
    .exec();

  if (!department) {
    throw createError(
      409,
      'DEPARTMENT_ASSIGNMENT_INVALID',
      'The HOD does not have an active department assignment.',
    );
  }

  return {
    hod,
    department,
  };
}

function normalizeFaculty(faculty, department) {
  return {
    id: faculty._id.toString(),
    institutionalId: faculty.institutionalId,
    fullName: faculty.fullName,
    email: faculty.email ?? null,
    role: faculty.role,
    status: faculty.status,

    department: {
      id: department._id.toString(),
      name: department.name,
      code: department.code,
    },

    assignedBatches: (faculty.assignedBatches || []).map(
      (batchId) => batchId.toString(),
    ),

    assignedSections: (faculty.assignedSections || []).map(
      (sectionId) => sectionId.toString(),
    ),

    isEmailVerified: faculty.isEmailVerified,
    lastLoginAt: faculty.lastLoginAt ?? null,
    createdAt: faculty.createdAt,
    updatedAt: faculty.updatedAt,
  };
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isManagedStaffRole(role) {
  return (
    role === USER_ROLES.FACULTY
    || role === USER_ROLES.MENTOR
  );
}

async function getManagedFaculty(facultyId, departmentId) {
  if (!mongoose.isValidObjectId(facultyId)) {
    throw createError(
      400,
      'INVALID_FACULTY_ID',
      'The supplied faculty account ID is invalid.',
    );
  }

  const faculty = await User.findOne({
    _id: facultyId,
    department: departmentId,
    role: {
      $in: [
        USER_ROLES.FACULTY,
        USER_ROLES.MENTOR,
      ],
    },
  }).exec();

  if (!faculty) {
    throw createError(
      404,
      'FACULTY_NOT_FOUND',
      'The requested faculty account was not found in your department.',
    );
  }

  return faculty;
}

export async function createFacultyController(req, res, next) {
  try {
    const { hod, department } = await getActiveHodDepartment(
      req.user?.id,
    );

    const {
      institutionalId,
      fullName,
      email,
      password,
    } = req.body;

    const normalizedInstitutionalId =
      institutionalId.trim().toUpperCase();

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      $or: [
        {
          institutionalId: normalizedInstitutionalId,
        },
        {
          email: normalizedEmail,
        },
      ],
    })
      .select('_id institutionalId email')
      .exec();

    if (existingUser) {
      const duplicateField =
        existingUser.institutionalId === normalizedInstitutionalId
          ? 'institutional ID'
          : 'email';

      return next(
        createError(
          409,
          'ACCOUNT_ALREADY_EXISTS',
          `An account with this ${duplicateField} already exists.`,
        ),
      );
    }

    const passwordHash = await hashPassword(password);

    const faculty = await User.create({
      institutionalId: normalizedInstitutionalId,
      fullName: fullName.trim(),
      email: normalizedEmail,
      passwordHash,
      role: USER_ROLES.FACULTY,
      status: ACCOUNT_STATUSES.ACTIVE,
      department: department._id,
      createdBy: hod._id,
      isEmailVerified: false,
    });

    return res.status(201).json({
      success: true,
      message: 'Faculty account created successfully.',
      data: {
        user: {
          id: faculty.id,
          institutionalId: faculty.institutionalId,
          fullName: faculty.fullName,
          email: faculty.email,
          role: faculty.role,
          status: faculty.status,

          department: {
            id: department.id,
            name: department.name,
            code: department.code,
          },

          isEmailVerified: faculty.isEmailVerified,
          createdAt: faculty.createdAt,
        },
      },
    });
  } catch (error) {
    if (error?.code === 11000) {
      error.statusCode = 409;
      error.code = 'ACCOUNT_ALREADY_EXISTS';
      error.message =
        'An account with this institutional ID or email already exists.';
    }

    return next(error);
  }
}

/**
 * Lists faculty members in the authenticated HOD's department.
 *
 * GET /api/v1/provisioning/faculty
 */
export async function listFacultyController(req, res, next) {
  try {
    const { department } = await getActiveHodDepartment(
      req.user?.id,
    );

    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const search = String(req.query.search ?? '').trim();

    const filter = {
      department: department._id,

      role: {
        $in: [
          USER_ROLES.FACULTY,
          USER_ROLES.MENTOR,
        ],
      },
    };

    if (req.query.role) {
      filter.role = req.query.role;
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (search) {
      const searchRegex = new RegExp(
        escapeRegex(search),
        'i',
      );

      filter.$or = [
        {
          institutionalId: searchRegex,
        },
        {
          fullName: searchRegex,
        },
        {
          email: searchRegex,
        },
      ];
    }

    const skip = (page - 1) * limit;

    const [facultyMembers, total] = await Promise.all([
      User.find(filter)
        .select(
          [
            'institutionalId',
            'fullName',
            'email',
            'role',
            'status',
            'department',
            'assignedBatches',
            'assignedSections',
            'isEmailVerified',
            'lastLoginAt',
            'createdAt',
            'updatedAt',
          ].join(' '),
        )
        .sort({
          createdAt: -1,
          _id: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),

      User.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: 'Faculty members retrieved successfully.',
      data: {
        faculty: facultyMembers.map(
          (faculty) => normalizeFaculty(faculty, department),
        ),

        department: {
          id: department.id,
          name: department.name,
          code: department.code,
        },

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
 * Retrieves one faculty or mentor account belonging to the
 * authenticated HOD's department.
 *
 * GET /api/v1/provisioning/faculty/:facultyId
 */
export async function getFacultyByIdController(req, res, next) {
  try {
    const { department } = await getActiveHodDepartment(
      req.user?.id,
    );

    const faculty = await getManagedFaculty(
      req.params.facultyId,
      department._id,
    );

    return res.status(200).json({
      success: true,
      message: 'Faculty account retrieved successfully.',
      data: {
        faculty: normalizeFaculty(faculty, department),
      },
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Updates institutional ID, full name, and email for a managed
 * faculty or mentor account.
 *
 * Department, role, account status, password, and batch/section
 * assignments cannot be changed through this endpoint.
 *
 * PATCH /api/v1/provisioning/faculty/:facultyId
 */
export async function updateFacultyController(req, res, next) {
  try {
    const { department } = await getActiveHodDepartment(
      req.user?.id,
    );

    const faculty = await getManagedFaculty(
      req.params.facultyId,
      department._id,
    );

    const allowedFields = [
      'institutionalId',
      'fullName',
      'email',
    ];

    const submittedFields = Object.keys(req.body ?? {});

    const unsupportedFields = submittedFields.filter(
      (field) => !allowedFields.includes(field),
    );

    if (unsupportedFields.length > 0) {
      throw createError(
        400,
        'FACULTY_FIELD_NOT_EDITABLE',
        'Only institutionalId, fullName, and email can be updated here.',
      );
    }

    if (submittedFields.length === 0) {
      throw createError(
        400,
        'EMPTY_FACULTY_UPDATE',
        'Provide at least one field to update.',
      );
    }

    let changed = false;
    let emailChanged = false;

    if (Object.hasOwn(req.body, 'institutionalId')) {
      const institutionalId =
        req.body.institutionalId.trim().toUpperCase();

      if (institutionalId.length < 2 || institutionalId.length > 50) {
        throw createError(
          400,
          'INVALID_INSTITUTIONAL_ID',
          'Institutional ID must contain between 2 and 50 characters.',
        );
      }

      if (faculty.institutionalId !== institutionalId) {
        const duplicateId = await User.findOne({
          institutionalId,
          _id: { $ne: faculty._id },
        })
          .select('_id')
          .lean()
          .exec();

        if (duplicateId) {
          throw createError(
            409,
            'INSTITUTIONAL_ID_ALREADY_IN_USE',
            'This institutional ID is already associated with another account.',
          );
        }

        faculty.institutionalId = institutionalId;
        changed = true;
      }
    }

    if (Object.hasOwn(req.body, 'fullName')) {
      const fullName = req.body.fullName.trim();

      if (fullName.length < 2 || fullName.length > 100) {
        throw createError(
          400,
          'INVALID_FULL_NAME',
          'Full name must contain between 2 and 100 characters.',
        );
      }

      if (faculty.fullName !== fullName) {
        faculty.fullName = fullName;
        changed = true;
      }
    }

    if (Object.hasOwn(req.body, 'email')) {
      const email = req.body.email.trim().toLowerCase();

      if (
        email.length > 254
        || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      ) {
        throw createError(
          400,
          'INVALID_EMAIL',
          'Provide a valid email address.',
        );
      }

      if ((faculty.email ?? '') !== email) {
        const duplicateEmail = await User.findOne({
          email,
          _id: { $ne: faculty._id },
        })
          .select('_id')
          .lean()
          .exec();

        if (duplicateEmail) {
          throw createError(
            409,
            'EMAIL_ALREADY_IN_USE',
            'This email address is already associated with another account.',
          );
        }

        faculty.email = email;
        faculty.isEmailVerified = false;
        faculty.emailVerifiedAt = null;

        changed = true;
        emailChanged = true;
      }
    }

    if (!changed) {
      return res.status(200).json({
        success: true,
        message: 'No changes were necessary.',
        data: {
          faculty: normalizeFaculty(faculty, department),
        },
      });
    }

    await faculty.save();

    return res.status(200).json({
      success: true,
      message: emailChanged
        ? 'Faculty account updated. The new email address requires verification.'
        : 'Faculty account updated successfully.',
      data: {
        faculty: normalizeFaculty(faculty, department),
      },
    });
  } catch (error) {
    if (error?.code === 11000) {
      error.statusCode = 409;
      error.code = 'ACCOUNT_ALREADY_EXISTS';
      error.message =
        'The institutional ID or email address is already in use.';
    }

    return next(error);
  }
}