import { User, USER_ROLES, ACCOUNT_STATUSES } from '../models/user.model.js';
import { Department } from '../models/department.model.js';
import { hashPassword } from '../services/auth/password.service.js';

function createError(statusCode, code, message) {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.code = code;

  return error;
}

export async function createFacultyController(req, res, next) {
  try {
    // Resolve the authenticated user from the database.
    const hod = await User.findById(req.user?.id)
      .select('role status department');

    if (
      !hod
      || hod.status !== ACCOUNT_STATUSES.ACTIVE
      || hod.role !== USER_ROLES.HOD
    ) {
      return next(
        createError(
          hod ? 403 : 401,
          hod ? 'FORBIDDEN' : 'UNAUTHORIZED',
          'Only an active HOD can create faculty accounts.',
        ),
      );
    }

    if (!hod.department) {
      return next(
        createError(
          409,
          'DEPARTMENT_NOT_ASSIGNED',
          'The HOD is not assigned to a department.',
        ),
      );
    }

    const department = await Department.findOne({
      _id: hod.department,
      hod: hod._id,
      status: 'ACTIVE',
    }).select('_id name code');

    if (!department) {
      return next(
        createError(
          409,
          'DEPARTMENT_ASSIGNMENT_INVALID',
          'The HOD does not have an active department assignment.',
        ),
      );
    }

    const {
      institutionalId,
      fullName,
      email,
      password,
    } = req.body;

    const normalizedInstitutionalId =
      institutionalId.trim().toUpperCase();

    const normalizedEmail = email.trim().toLowerCase();

    // Check institutional ID and email uniqueness.
    const existingUser = await User.findOne({
      $or: [
        { institutionalId: normalizedInstitutionalId },
        { email: normalizedEmail },
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