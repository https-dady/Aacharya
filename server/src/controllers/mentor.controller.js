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

async function getActiveHodDepartment(userId, session = null) {
  let hodQuery = User.findById(userId)
    .select('role status department');

  if (session) {
    hodQuery = hodQuery.session(session);
  }

  const hod = await hodQuery;

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

  let departmentQuery = Department.findOne({
    _id: hod.department,
    hod: hod._id,
    status: 'ACTIVE',
  }).select('_id name code');

  if (session) {
    departmentQuery = departmentQuery.session(session);
  }

  const department = await departmentQuery;

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

function uniqueIds(values) {
  return [...new Set(values.map(String))];
}

function sameId(left, right) {
  return Boolean(left && right && String(left) === String(right));
}

function normalizeMentor(mentor, department, batches, sections) {
  const assignedBatchIds = new Set(
    (mentor.assignedBatches ?? []).map((id) => String(id)),
  );

  const assignedSectionIds = new Set(
    (mentor.assignedSections ?? []).map((id) => String(id)),
  );

  return {
    id: String(mentor._id),
    institutionalId: mentor.institutionalId,
    fullName: mentor.fullName,
    email: mentor.email ?? null,
    role: mentor.role,
    status: mentor.status,

    department: {
      id: String(department._id),
      name: department.name,
      code: department.code,
    },

    assignedBatches: batches
      .filter((batch) => assignedBatchIds.has(String(batch._id)))
      .map((batch) => ({
        id: String(batch._id),
        name: batch.name,
        code: batch.code,
        academicYear: batch.academicYear,
      })),

    assignedSections: sections
      .filter((section) => assignedSectionIds.has(String(section._id)))
      .map((section) => ({
        id: String(section._id),
        name: section.name,
        code: section.code,
        batch: String(section.batch),
      })),

    createdAt: mentor.createdAt,
    updatedAt: mentor.updatedAt,
  };
}

export async function assignMentorController(req, res, next) {
  const session = await mongoose.startSession();

  try {
    const { facultyId } = req.params;
    const { batchIds, sectionIds } = req.body ?? {};

    if (!mongoose.isValidObjectId(facultyId)) {
      throw createError(
        400,
        'INVALID_FACULTY_ID',
        'A valid faculty ID is required.',
      );
    }

    if (!Array.isArray(batchIds) || !Array.isArray(sectionIds)) {
      throw createError(
        400,
        'INVALID_ASSIGNMENT_PAYLOAD',
        'batchIds and sectionIds must both be arrays.',
      );
    }

    if (
      batchIds.some((id) => !mongoose.isValidObjectId(id))
      || sectionIds.some((id) => !mongoose.isValidObjectId(id))
    ) {
      throw createError(
        400,
        'INVALID_ASSIGNMENT_ID',
        'All batch and section IDs must be valid.',
      );
    }

    const uniqueBatchIds = uniqueIds(batchIds);
    const uniqueSectionIds = uniqueIds(sectionIds);

    if (uniqueSectionIds.length > 0 && uniqueBatchIds.length === 0) {
      throw createError(
        422,
        'INVALID_SECTION_ASSIGNMENT',
        'A section cannot be assigned without its batch.',
      );
    }

    let responseData;

    await session.withTransaction(async () => {
      const { department } = await getActiveHodDepartment(
        req.user?.id,
        session,
      );

      const faculty = await User.findOne({
        _id: facultyId,
        department: department._id,
        role: {
          $in: [USER_ROLES.FACULTY, USER_ROLES.MENTOR],
        },
        status: ACCOUNT_STATUSES.ACTIVE,
      })
        .session(session)
        .select(
          'institutionalId fullName email role status department assignedBatches assignedSections createdAt updatedAt',
        );

      if (!faculty) {
        throw createError(
          404,
          'FACULTY_NOT_FOUND',
          'No active Faculty member was found in your department.',
        );
      }

      const batches = uniqueBatchIds.length
        ? await Batch.find({
            _id: { $in: uniqueBatchIds },
            department: department._id,
            status: 'ACTIVE',
          })
            .session(session)
            .select('_id name code academicYear')
        : [];

      if (batches.length !== uniqueBatchIds.length) {
        throw createError(
          422,
          'INVALID_BATCH_ASSIGNMENT',
          'Every assigned batch must be active and belong to your department.',
        );
      }

      const sections = uniqueSectionIds.length
        ? await Section.find({
            _id: { $in: uniqueSectionIds },
            department: department._id,
            batch: { $in: uniqueBatchIds },
            status: 'ACTIVE',
          })
            .session(session)
            .select('_id name code batch department status mentor')
        : [];

      if (sections.length !== uniqueSectionIds.length) {
        throw createError(
          422,
          'INVALID_SECTION_ASSIGNMENT',
          'Every assigned section must be active, belong to your department, and belong to an assigned batch.',
        );
      }

      const selectedSectionObjectIds = sections.map(
        (section) => section._id,
      );

      /*
       * Remove selected sections from every other mentor's assignment
       * list, including stale legacy assignments where Section.mentor
       * is missing. Other section assignments remain untouched.
       */
      await User.updateMany(
        {
          _id: { $ne: faculty._id },
          department: department._id,
          role: USER_ROLES.MENTOR,
          assignedSections: {
            $in: selectedSectionObjectIds,
          },
        },
        {
          $pull: {
            assignedSections: {
              $in: selectedSectionObjectIds,
            },
          },
        },
        { session },
      );

      /*
       * Section.mentor is the canonical owner of each section.
       */
      if (sections.length > 0) {
        await Section.updateMany(
          {
            _id: { $in: selectedSectionObjectIds },
            department: department._id,
            status: 'ACTIVE',
          },
          {
            $set: {
              mentor: faculty._id,
            },
          },
          { session },
        );
      }

      /*
       * Preserve the target mentor's existing assignments and add the
       * selected sections and batches without duplicating their IDs.
       */
      faculty.role = USER_ROLES.MENTOR;

      faculty.assignedBatches = [
        ...new Map(
          [
            ...(faculty.assignedBatches ?? []),
            ...batches.map((batch) => batch._id),
          ].map((id) => [String(id), id]),
        ).values(),
      ];

      faculty.assignedSections = [
        ...new Map(
          [
            ...(faculty.assignedSections ?? []),
            ...selectedSectionObjectIds,
          ].map((id) => [String(id), id]),
        ).values(),
      ];

      await faculty.save({ session });

      /*
       * Read back the target mentor's current assignments for the
       * response.
       */
      const assignedBatchIds = faculty.assignedBatches ?? [];
      const assignedSectionIds = faculty.assignedSections ?? [];

      const [allAssignedBatches, allAssignedSections] = await Promise.all([
        assignedBatchIds.length
          ? Batch.find({
              _id: { $in: assignedBatchIds },
              department: department._id,
            })
              .session(session)
              .select('_id name code academicYear')
          : [],

        assignedSectionIds.length
          ? Section.find({
              _id: { $in: assignedSectionIds },
              department: department._id,
            })
              .session(session)
              .select('_id name code batch')
          : [],
      ]);

      responseData = {
        mentor: normalizeMentor(
          faculty.toObject(),
          department,
          allAssignedBatches,
          allAssignedSections,
        ),
      };
    });

    return res.status(200).json({
      success: true,
      message: 'Mentor role and assignments updated successfully.',
      data: responseData,
    });
  } catch (error) {
    return next(error);
  } finally {
    await session.endSession();
  }
}

export async function listMentorsController(req, res, next) {
  try {
    const { department } = await getActiveHodDepartment(
      req.user?.id,
    );

    const page = Math.max(1, Number.parseInt(req.query.page ?? '1', 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(req.query.limit ?? '20', 10) || 20),
    );

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

    const batchIds = uniqueIds(
      mentors.flatMap((mentor) =>
        (mentor.assignedBatches ?? []).map((id) => String(id)),
      ),
    );

    /*
     * Resolve section assignments from the canonical Section.mentor
     * relationship instead of relying only on legacy user arrays.
     */
    const mentorIds = mentors.map((mentor) => mentor._id);

    const [batches, ownedSections] = await Promise.all([
      batchIds.length
        ? Batch.find({
            _id: { $in: batchIds },
            department: department._id,
          }).select('_id name code academicYear')
        : [],

      mentorIds.length
        ? Section.find({
            mentor: { $in: mentorIds },
            department: department._id,
          }).select('_id name code batch mentor')
        : [],
    ]);

    const mentorsWithCanonicalSections = mentors.map((mentor) => ({
      ...mentor,
      assignedSections: ownedSections
        .filter((section) => sameId(section.mentor, mentor._id))
        .map((section) => section._id),
    }));

    const allOwnedBatchIds = uniqueIds([
      ...batchIds,
      ...ownedSections.map((section) => String(section.batch)),
    ]);

    const missingBatches = allOwnedBatchIds.length
      ? await Batch.find({
          _id: { $in: allOwnedBatchIds },
          department: department._id,
        }).select('_id name code academicYear')
      : [];

    const batchMap = new Map(
      missingBatches.map((batch) => [String(batch._id), batch]),
    );

    const batchesForResponse = [...batchMap.values()];

    return res.status(200).json({
      success: true,
      message: 'Mentors retrieved successfully.',
      data: {
        mentors: mentorsWithCanonicalSections.map((mentor) =>
          normalizeMentor(
            mentor,
            department,
            batchesForResponse,
            ownedSections,
          ),
        ),

        department: {
          id: String(department._id),
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