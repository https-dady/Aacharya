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
  const hod = await User.findById(userId)
    .select('role status department');

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
  }).select('_id name code');

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
    }).select('_id institutionalId email');

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
 * Supports:
 * - Pagination
 * - Search by institutional ID, name, or email
 * - Filtering by faculty/mentor role
 * - Filtering by account status
 * - Most recently created first
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
          'institutionalId fullName email role status department assignedBatches assignedSections isEmailVerified lastLoginAt createdAt updatedAt',
        )
        .sort({
          createdAt: -1,
          _id: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean(),

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