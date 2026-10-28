import mongoose from 'mongoose';

import {
  User,
  USER_ROLES,
  ACCOUNT_STATUSES,
} from '../models/user.model.js';

import { Batch } from '../models/batch.model.js';
import { Section } from '../models/section.model.js';
import { hashPassword } from '../services/auth/password.service.js';

function createError(statusCode, code, message) {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.code = code;

  return error;
}

function normalizeStudent(student) {
  return {
    id: student._id.toString(),
    institutionalId: student.institutionalId,
    fullName: student.fullName,
    email: student.email ?? null,
    role: student.role,
    status: student.status,
    isAccountActivated: student.isAccountActivated,
    department: student.department?.toString() ?? null,
    assignedBatches: (student.assignedBatches || []).map(
      (id) => id.toString(),
    ),
    assignedSections: (student.assignedSections || []).map(
      (id) => id.toString(),
    ),
    isEmailVerified: student.isEmailVerified,
    createdAt: student.createdAt,
    updatedAt: student.updatedAt,
  };
}

async function getActiveMentor(userId) {
  const mentor = await User.findById(userId)
    .select(
      'role status department assignedBatches assignedSections',
    );

  if (!mentor) {
    throw createError(
      401,
      'UNAUTHORIZED',
      'The authenticated account was not found.',
    );
  }

  if (
    mentor.status !== ACCOUNT_STATUSES.ACTIVE ||
    mentor.role !== USER_ROLES.MENTOR
  ) {
    throw createError(
      403,
      'FORBIDDEN',
      'Only active mentors can manage student accounts.',
    );
  }

  return mentor;
}

async function getAssignedSection(mentor, sectionId) {
  if (!mongoose.isValidObjectId(sectionId)) {
    throw createError(
      400,
      'INVALID_SECTION_ID',
      'A valid section ID is required.',
    );
  }

  const section = await Section.findOne({
    _id: sectionId,
    department: mentor.department,
    status: 'ACTIVE',
  }).select('_id name code batch department status');

  if (!section) {
    throw createError(
      404,
      'SECTION_NOT_FOUND',
      'The requested active section was not found in your department.',
    );
  }

  const assignedSectionIds = (
    mentor.assignedSections || []
  ).map((id) => id.toString());

  if (!assignedSectionIds.includes(section._id.toString())) {
    throw createError(
      403,
      'SECTION_NOT_ASSIGNED',
      'You can only manage students in your assigned sections.',
    );
  }

  const assignedBatchIds = (
    mentor.assignedBatches || []
  ).map((id) => id.toString());

  if (!assignedBatchIds.includes(section.batch.toString())) {
    throw createError(
      403,
      'BATCH_NOT_ASSIGNED',
      'The section belongs to a batch that is not assigned to you.',
    );
  }

  const batch = await Batch.findOne({
    _id: section.batch,
    department: mentor.department,
    status: 'ACTIVE',
  }).select('_id name code academicYear department');

  if (!batch) {
    throw createError(
      409,
      'BATCH_INACTIVE',
      'The section batch is unavailable or inactive.',
    );
  }

  return {
    section,
    batch,
  };
}

async function getStudentInSection(
  sectionId,
  studentId,
  departmentId,
) {
  if (!mongoose.isValidObjectId(studentId)) {
    throw createError(
      400,
      'INVALID_STUDENT_ID',
      'A valid student ID is required.',
    );
  }

  const student = await User.findOne({
    _id: studentId,
    role: USER_ROLES.STUDENT,
    department: departmentId,
    assignedSections: sectionId,
  }).select(
    'institutionalId fullName email role status isAccountActivated department assignedBatches assignedSections isEmailVerified createdAt updatedAt',
  );

  if (!student) {
    throw createError(
      404,
      'STUDENT_NOT_FOUND',
      'The student was not found in your assigned section.',
    );
  }

  return student;
}

function getDuplicateKeyError(error) {
  if (error?.code !== 11000) {
    return null;
  }

  const duplicateField = Object.keys(
    error.keyPattern || {},
  )[0];

  if (duplicateField === 'email') {
    return createError(
      409,
      'EMAIL_ALREADY_EXISTS',
      'An account with this email address already exists.',
    );
  }

  if (duplicateField === 'institutionalId') {
    return createError(
      409,
      'INSTITUTIONAL_ID_ALREADY_EXISTS',
      'An account with this institutional ID already exists.',
    );
  }

  return createError(
    409,
    'DUPLICATE_RECORD',
    'A conflicting record already exists.',
  );
}

/**
 * Create an individual student account.
 *
 * Newly provisioned students must complete account activation
 * before they can sign in.
 */
export async function createStudentController(req, res, next) {
  try {
    const mentor = await getActiveMentor(req.user?.id);

    const { section } = await getAssignedSection(
      mentor,
      req.params.sectionId,
    );

    const {
      institutionalId,
      fullName,
      email,
      password,
    } = req.body;

    const normalizedInstitutionalId =
      institutionalId.trim().toUpperCase();

    const normalizedEmail = email
      ? email.trim().toLowerCase()
      : undefined;

    const duplicateConditions = [
      {
        institutionalId: normalizedInstitutionalId,
      },
    ];

    if (normalizedEmail) {
      duplicateConditions.push({
        email: normalizedEmail,
      });
    }

    const existingUser = await User.findOne({
      $or: duplicateConditions,
    }).select('_id institutionalId email');

    if (existingUser) {
      const duplicateField =
        existingUser.institutionalId === normalizedInstitutionalId
          ? 'institutional ID'
          : 'email';

      throw createError(
        409,
        'ACCOUNT_ALREADY_EXISTS',
        `An account with this ${duplicateField} already exists.`,
      );
    }

    const passwordHash = await hashPassword(password);

    const student = await User.create({
      institutionalId: normalizedInstitutionalId,
      fullName: fullName.trim(),
      ...(normalizedEmail
        ? { email: normalizedEmail }
        : {}),
      passwordHash,
      role: USER_ROLES.STUDENT,
      status: ACCOUNT_STATUSES.ACTIVE,
      isAccountActivated: false,
      department: section.department,
      assignedBatches: [section.batch],
      assignedSections: [section._id],
      createdBy: mentor._id,
      isEmailVerified: false,
    });

    return res.status(201).json({
      success: true,
      message: 'Student account created. Activation is required before sign-in.',
      data: {
        student: normalizeStudent(student),
      },
    });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      error.statusCode = 422;
      error.code = 'VALIDATION_ERROR';
    }

    const duplicateError = getDuplicateKeyError(error);

    return next(duplicateError || error);
  }
}

/**
 * List students belonging to a section assigned to the mentor.
 *
 * Supports pagination, search, status filtering, and recent-first
 * sorting.
 */
export async function listStudentsController(req, res, next) {
  try {
    const mentor = await getActiveMentor(req.user?.id);

    const { section, batch } = await getAssignedSection(
      mentor,
      req.params.sectionId,
    );

    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const search = String(req.query.search ?? '').trim();
    const status = req.query.status;

    const filter = {
      role: USER_ROLES.STUDENT,
      department: mentor.department,
      assignedSections: section._id,
    };

    if (status) {
      filter.status = status;
    }

    if (search) {
      const escapedSearch = search.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&',
      );

      const searchRegex = new RegExp(escapedSearch, 'i');

      filter.$or = [
        { institutionalId: searchRegex },
        { fullName: searchRegex },
        { email: searchRegex },
      ];
    }

    const skip = (page - 1) * limit;

    const [students, total] = await Promise.all([
      User.find(filter)
        .select(
          'institutionalId fullName email role status isAccountActivated department assignedBatches assignedSections isEmailVerified createdAt updatedAt',
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
      message: 'Students retrieved successfully.',
      data: {
        students: students.map(normalizeStudent),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page * limit < total,
          hasPreviousPage: page > 1,
        },
        section: {
          id: section._id.toString(),
          name: section.name,
          code: section.code,
        },
        batch: {
          id: batch._id.toString(),
          name: batch.name,
          code: batch.code,
          academicYear: batch.academicYear,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Retrieve a single student belonging to an assigned section.
 */
export async function getStudentDetailsController(
  req,
  res,
  next,
) {
  try {
    const mentor = await getActiveMentor(req.user?.id);

    const { section, batch } = await getAssignedSection(
      mentor,
      req.params.sectionId,
    );

    const student = await getStudentInSection(
      section._id,
      req.params.studentId,
      mentor.department,
    );

    return res.status(200).json({
      success: true,
      message: 'Student details retrieved successfully.',
      data: {
        student: normalizeStudent(student),
        section: {
          id: section._id.toString(),
          name: section.name,
          code: section.code,
        },
        batch: {
          id: batch._id.toString(),
          name: batch.name,
          code: batch.code,
          academicYear: batch.academicYear,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Update permitted student profile fields.
 *
 * Institutional ID, role, department, batch assignments,
 * section assignments, and password are not editable here.
 */
export async function updateStudentController(req, res, next) {
  try {
    const mentor = await getActiveMentor(req.user?.id);

    const { section } = await getAssignedSection(
      mentor,
      req.params.sectionId,
    );

    const student = await getStudentInSection(
      section._id,
      req.params.studentId,
      mentor.department,
    );

    const updates = {};

    if (req.body.fullName !== undefined) {
      updates.fullName = req.body.fullName.trim();
    }

    if (req.body.email !== undefined) {
      const normalizedEmail = req.body.email
        ? req.body.email.trim().toLowerCase()
        : '';

      if (normalizedEmail) {
        const existingEmail = await User.findOne({
          email: normalizedEmail,
          _id: {
            $ne: student._id,
          },
        }).select('_id');

        if (existingEmail) {
          throw createError(
            409,
            'EMAIL_ALREADY_EXISTS',
            'An account with this email address already exists.',
          );
        }

        updates.email = normalizedEmail;
      } else {
        updates.email = undefined;
      }

      updates.isEmailVerified = false;
      updates.emailVerifiedAt = null;
    }

    if (Object.keys(updates).length === 0) {
      throw createError(
        400,
        'NO_UPDATES_PROVIDED',
        'Provide at least one supported profile field to update.',
      );
    }

    Object.assign(student, updates);

    await student.save();

    return res.status(200).json({
      success: true,
      message: 'Student profile updated successfully.',
      data: {
        student: normalizeStudent(student),
      },
    });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      error.statusCode = 422;
      error.code = 'VALIDATION_ERROR';
    }

    const duplicateError = getDuplicateKeyError(error);

    return next(duplicateError || error);
  }
}

/**
 * Change a student's account status.
 *
 * Allowed statuses: ACTIVE, SUSPENDED, DISABLED.
 */
export async function updateStudentStatusController(
  req,
  res,
  next,
) {
  try {
    const mentor = await getActiveMentor(req.user?.id);

    const { section } = await getAssignedSection(
      mentor,
      req.params.sectionId,
    );

    const student = await getStudentInSection(
      section._id,
      req.params.studentId,
      mentor.department,
    );

    const { status } = req.body;

    if (!Object.values(ACCOUNT_STATUSES).includes(status)) {
      throw createError(
        422,
        'INVALID_ACCOUNT_STATUS',
        'The requested account status is invalid.',
      );
    }

    if (student.status === status) {
      return res.status(200).json({
        success: true,
        message: 'Student already has the requested status.',
        data: {
          student: normalizeStudent(student),
        },
      });
    }

    student.status = status;

    await student.save();

    return res.status(200).json({
      success: true,
      message: 'Student account status updated successfully.',
      data: {
        student: normalizeStudent(student),
      },
    });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      error.statusCode = 422;
      error.code = 'VALIDATION_ERROR';
    }

    return next(error);
  }
}