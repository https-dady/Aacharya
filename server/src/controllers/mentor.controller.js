import mongoose from 'mongoose';

import {
  User,
  USER_ROLES,
  ACCOUNT_STATUSES,
} from '../models/user.model.js';

import { Department } from '../models/department.model.js';
import { Batch } from '../models/batch.model.js';
import { Section } from '../models/section.model.js';

function createError(statusCode, code, message) {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.code = code;

  return error;
}

async function getActiveHodDepartment(userId) {
  const hod = await User.findById(userId)
    .select('role status department');

  if (
    !hod
    || hod.status !== ACCOUNT_STATUSES.ACTIVE
    || hod.role !== USER_ROLES.HOD
  ) {
    throw createError(
      hod ? 403 : 401,
      hod ? 'FORBIDDEN' : 'UNAUTHORIZED',
      'Only an active HOD can manage mentor assignments.',
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

  return { hod, department };
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeMentor(mentor, department, batches, sections) {
  const assignedBatchIds = new Set(
    (mentor.assignedBatches ?? []).map((id) => id.toString()),
  );

  const assignedSectionIds = new Set(
    (mentor.assignedSections ?? []).map((id) => id.toString()),
  );

  return {
    id: mentor._id.toString(),
    institutionalId: mentor.institutionalId,
    fullName: mentor.fullName,
    email: mentor.email ?? null,
    role: mentor.role,
    status: mentor.status,

    department: {
      id: department._id.toString(),
      name: department.name,
      code: department.code,
    },

    assignedBatches: batches
      .filter((batch) => assignedBatchIds.has(batch._id.toString()))
      .map((batch) => ({
        id: batch._id.toString(),
        name: batch.name,
        code: batch.code,
        academicYear: batch.academicYear,
      })),

    assignedSections: sections
      .filter((section) => assignedSectionIds.has(section._id.toString()))
      .map((section) => ({
        id: section._id.toString(),
        name: section.name,
        code: section.code,
        batch: section.batch.toString(),
      })),

    createdAt: mentor.createdAt,
    updatedAt: mentor.updatedAt,
  };
}

export async function assignMentorController(req, res, next) {
  try {
    const { department } = await getActiveHodDepartment(
      req.user?.id,
    );

    const { facultyId } = req.params;
    const { batchIds, sectionIds } = req.body;

    if (!mongoose.isValidObjectId(facultyId)) {
      return next(
        createError(
          400,
          'INVALID_FACULTY_ID',
          'A valid faculty ID is required.',
        ),
      );
    }

    const uniqueBatchIds = [...new Set(batchIds)];
    const uniqueSectionIds = [...new Set(sectionIds)];

    if (
      uniqueBatchIds.some((id) => !mongoose.isValidObjectId(id))
      || uniqueSectionIds.some((id) => !mongoose.isValidObjectId(id))
    ) {
      return next(
        createError(
          400,
          'INVALID_ASSIGNMENT_ID',
          'All batch and section IDs must be valid.',
        ),
      );
    }

    const faculty = await User.findOne({
      _id: facultyId,
      department: department._id,
      role: {
        $in: [USER_ROLES.FACULTY, USER_ROLES.MENTOR],
      },
      status: ACCOUNT_STATUSES.ACTIVE,
    }).select(
      'institutionalId fullName email role status department assignedBatches assignedSections',
    );

    if (!faculty) {
      return next(
        createError(
          404,
          'FACULTY_NOT_FOUND',
          'No active Faculty member was found in your department.',
        ),
      );
    }

    const batches = await Batch.find({
      _id: { $in: uniqueBatchIds },
      department: department._id,
      status: 'ACTIVE',
    }).select('_id name code academicYear');

    if (batches.length !== uniqueBatchIds.length) {
      return next(
        createError(
          422,
          'INVALID_BATCH_ASSIGNMENT',
          'Every assigned batch must be active and belong to your department.',
        ),
      );
    }

    const sections = await Section.find({
      _id: { $in: uniqueSectionIds },
      department: department._id,
      batch: { $in: uniqueBatchIds },
      status: 'ACTIVE',
    }).select('_id name code batch');

    if (sections.length !== uniqueSectionIds.length) {
      return next(
        createError(
          422,
          'INVALID_SECTION_ASSIGNMENT',
          'Every assigned section must be active, belong to your department, and belong to an assigned batch.',
        ),
      );
    }

    faculty.role = USER_ROLES.MENTOR;
    faculty.assignedBatches = batches.map((batch) => batch._id);
    faculty.assignedSections = sections.map((section) => section._id);

    await faculty.save();

    return res.status(200).json({
      success: true,
      message: 'Mentor role and assignments updated successfully.',
      data: {
        mentor: {
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

          assignedBatches: batches.map((batch) => ({
            id: batch.id,
            name: batch.name,
            code: batch.code,
            academicYear: batch.academicYear,
          })),

          assignedSections: sections.map((section) => ({
            id: section.id,
            name: section.name,
            code: section.code,
            batch: section.batch.toString(),
          })),
        },
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function listMentorsController(req, res, next) {
  try {
    const { department } = await getActiveHodDepartment(
      req.user?.id,
    );

    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const search = String(req.query.search ?? '').trim();

    const filter = {
      department: department._id,
      role: USER_ROLES.MENTOR,
    };

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (search) {
      const searchRegex = new RegExp(
        escapeRegex(search),
        'i',
      );

      filter.$or = [
        { institutionalId: searchRegex },
        { fullName: searchRegex },
        { email: searchRegex },
      ];
    }

    const skip = (page - 1) * limit;

    const [mentors, total] = await Promise.all([
      User.find(filter)
        .select(
          'institutionalId fullName email role status department assignedBatches assignedSections createdAt updatedAt',
        )
        .sort({
          fullName: 1,
          _id: 1,
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      User.countDocuments(filter),
    ]);

    const batchIds = [
      ...new Set(
        mentors.flatMap((mentor) =>
          (mentor.assignedBatches ?? []).map((id) => id.toString()),
        ),
      ),
    ];

    const sectionIds = [
      ...new Set(
        mentors.flatMap((mentor) =>
          (mentor.assignedSections ?? []).map((id) => id.toString()),
        ),
      ),
    ];

    const [batches, sections] = await Promise.all([
      batchIds.length
        ? Batch.find({
            _id: { $in: batchIds },
            department: department._id,
          }).select('_id name code academicYear')
        : [],

      sectionIds.length
        ? Section.find({
            _id: { $in: sectionIds },
            department: department._id,
          }).select('_id name code batch')
        : [],
    ]);

    return res.status(200).json({
      success: true,
      message: 'Mentors retrieved successfully.',

      data: {
        mentors: mentors.map((mentor) =>
          normalizeMentor(
            mentor,
            department,
            batches,
            sections,
          ),
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