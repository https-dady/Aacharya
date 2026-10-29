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
    (mentor.assignedBatches ?? []).map(String),
  );

  const assignedSectionIds = new Set(
    (mentor.assignedSections ?? []).map(String),
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

function validateAssignmentPayload(batchIds, sectionIds) {
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
      'A section cannot remain assigned without its batch.',
    );
  }

  return {
    uniqueBatchIds,
    uniqueSectionIds,
  };
}

/**
 * Assign or update a mentor's complete assignment selection.
 *
 * The submitted batchIds and sectionIds are authoritative:
 * - Selected assignments are retained.
 * - Previously assigned but deselected sections are unassigned.
 * - Sections owned by another mentor cannot be taken over.
 * - Empty arrays clear this mentor's batch and section assignments.
 * - Clearing assignments does not remove the Mentor role.
 */
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

    const {
      uniqueBatchIds,
      uniqueSectionIds,
    } = validateAssignmentPayload(batchIds, sectionIds);

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
          'Every selected batch must be active and belong to your department.',
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
          'Every selected section must be active, belong to your department, and belong to a selected batch.',
        );
      }

      /*
       * A section may have only one canonical mentor.
       * Never silently transfer a section from another mentor.
       */
      const conflictingSections = sections.filter(
        (section) => (
          section.mentor
          && !sameId(section.mentor, faculty._id)
        ),
      );

      if (conflictingSections.length > 0) {
        throw createError(
          409,
          'SECTION_ALREADY_ASSIGNED',
          'One or more selected sections are already assigned to another mentor. Remove those sections from the selection or unassign them from their current mentor first.',
        );
      }

      const selectedSectionObjectIds = sections.map(
        (section) => section._id,
      );

      /*
       * Find sections currently owned by this mentor but omitted
       * from the submitted selection.
       *
       * Those sections must become unassigned. Sections belonging
       * to another mentor are never included in this operation.
       */
      const omittedOwnedSections = await Section.find({
        department: department._id,
        mentor: faculty._id,
        _id: {
          $nin: selectedSectionObjectIds,
        },
      })
        .session(session)
        .select('_id');

      const omittedSectionIds = omittedOwnedSections.map(
        (section) => section._id,
      );

      if (omittedSectionIds.length > 0) {
        const unassignmentResult = await Section.updateMany(
          {
            _id: { $in: omittedSectionIds },
            department: department._id,
            mentor: faculty._id,
          },
          {
            $set: {
              mentor: null,
            },
          },
          { session },
        );

        if (unassignmentResult.modifiedCount !== omittedSectionIds.length) {
          throw createError(
            409,
            'ASSIGNMENT_UPDATE_CONFLICT',
            'The section assignments changed while this update was being processed. Please refresh and try again.',
          );
        }

        /*
         * Clean stale legacy references to the released sections
         * from users in this department. Canonical ownership is
         * still controlled exclusively by Section.mentor.
         */
        await User.updateMany(
          {
            department: department._id,
            _id: { $ne: faculty._id },
            assignedSections: { $in: omittedSectionIds },
          },
          {
            $pull: {
              assignedSections: {
                $in: omittedSectionIds,
              },
            },
          },
          { session },
        );
      }

      /*
       * Selected sections are either unassigned or already owned
       * by this mentor. The update remains scoped to this department.
       */
      if (selectedSectionObjectIds.length > 0) {
        const assignmentResult = await Section.updateMany(
          {
            _id: { $in: selectedSectionObjectIds },
            department: department._id,
            status: 'ACTIVE',
            $or: [
              { mentor: null },
              { mentor: { $exists: false } },
              { mentor: faculty._id },
            ],
          },
          {
            $set: {
              mentor: faculty._id,
            },
          },
          { session },
        );

        if (assignmentResult.matchedCount !== selectedSectionObjectIds.length) {
          throw createError(
            409,
            'ASSIGNMENT_UPDATE_CONFLICT',
            'One or more sections changed ownership while this update was being processed. Please refresh and try again.',
          );
        }
      }

      /*
       * Synchronize the User document with the submitted selection.
       * This deliberately replaces the arrays rather than appending.
       */
      faculty.role = USER_ROLES.MENTOR;
      faculty.assignedBatches = batches.map((batch) => batch._id);
      faculty.assignedSections = selectedSectionObjectIds;

      await faculty.save({ session });

      /*
       * Read the persisted state for the response.
       */
      const [savedBatches, ownedSections] = await Promise.all([
        faculty.assignedBatches.length
          ? Batch.find({
              _id: { $in: faculty.assignedBatches },
              department: department._id,
            })
              .session(session)
              .select('_id name code academicYear')
          : [],

        Section.find({
          mentor: faculty._id,
          department: department._id,
        })
          .session(session)
          .select('_id name code batch mentor'),
      ]);

      const responseMentor = {
        ...faculty.toObject(),
        assignedSections: ownedSections.map(
          (section) => section._id,
        ),
      };

      responseData = {
        mentor: normalizeMentor(
          responseMentor,
          department,
          savedBatches,
          ownedSections,
        ),
      };
    });

    return res.status(200).json({
      success: true,
      message: 'Mentor assignments updated successfully.',
      data: responseData,
    });
  } catch (error) {
    return next(error);
  } finally {
    await session.endSession();
  }
}

/**
 * Clear all mentor assignments within the active HOD's department.
 *
 * This operation:
 * - Unassigns mentors from every section in the department.
 * - Clears assignedBatches and assignedSections on mentor accounts.
 * - Cleans stale assignedSections references in department users.
 * - Does NOT delete or disable faculty accounts.
 * - Does NOT remove the Mentor role.
 *
 * A separate, explicit role-removal action should be used when
 * a faculty member must stop being a mentor entirely.
 */
export async function clearDepartmentMentorAssignmentsController(
  req,
  res,
  next,
) {
  const session = await mongoose.startSession();

  try {
    let responseData;

    await session.withTransaction(async () => {
      const { department } = await getActiveHodDepartment(
        req.user?.id,
        session,
      );

      const departmentMentors = await User.find({
        department: department._id,
        role: USER_ROLES.MENTOR,
      })
        .session(session)
        .select('_id');

      const mentorIds = departmentMentors.map(
        (mentor) => mentor._id,
      );

      /*
       * Clear all canonical mentor relationships within the
       * department, including any stale relationship pointing
       * to a user whose role has changed.
       */
      const ownedSections = await Section.find({
        department: department._id,
        mentor: { $ne: null },
      })
        .session(session)
        .select('_id');

      const sectionIds = ownedSections.map(
        (section) => section._id,
      );

      let unassignedSectionCount = 0;

      if (sectionIds.length > 0) {
        const result = await Section.updateMany(
          {
            _id: { $in: sectionIds },
            department: department._id,
            mentor: { $ne: null },
          },
          {
            $set: {
              mentor: null,
            },
          },
          { session },
        );

        unassignedSectionCount = result.modifiedCount;
      }

      /*
       * Clear legacy section references for all department users
       * so the canonical and denormalized assignment data agree.
       */
      if (sectionIds.length > 0) {
        await User.updateMany(
          {
            department: department._id,
            assignedSections: { $in: sectionIds },
          },
          {
            $pull: {
              assignedSections: {
                $in: sectionIds,
              },
            },
          },
          { session },
        );
      }

      /*
       * Keep the Mentor role, but remove all batch and section
       * assignments from every mentor in this department.
       */
      let clearedMentorCount = 0;

      if (mentorIds.length > 0) {
        const result = await User.updateMany(
          {
            _id: { $in: mentorIds },
            department: department._id,
            role: USER_ROLES.MENTOR,
          },
          {
            $set: {
              assignedBatches: [],
              assignedSections: [],
            },
          },
          { session },
        );

        clearedMentorCount = result.modifiedCount;
      }

      responseData = {
        department: {
          id: String(department._id),
          name: department.name,
          code: department.code,
        },
        unassignedSectionCount,
        clearedMentorCount,
      };
    });

    return res.status(200).json({
      success: true,
      message: 'All mentor assignments in the department have been cleared. Mentor roles and faculty accounts remain unchanged.',
      data: responseData,
    });
  } catch (error) {
    return next(error);
  } finally {
    await session.endSession();
  }
}

/**
 * Retrieve mentors for the active HOD's department.
 */
export async function listMentorsController(req, res, next) {
  try {
    const { department } = await getActiveHodDepartment(
      req.user?.id,
    );

    const page = Math.max(
      1,
      Number.parseInt(req.query.page ?? '1', 10) || 1,
    );

    const limit = Math.min(
      100,
      Math.max(
        1,
        Number.parseInt(req.query.limit ?? '20', 10) || 20,
      ),
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

    const mentorIds = mentors.map((mentor) => mentor._id);

    const [canonicalSections, mentorBatches] = await Promise.all([
      mentorIds.length
        ? Section.find({
            mentor: { $in: mentorIds },
            department: department._id,
          }).select('_id name code batch mentor')
        : [],

      mentors.length
        ? Batch.find({
            _id: {
              $in: uniqueIds(
                mentors.flatMap((mentor) =>
                  (mentor.assignedBatches ?? []).map(String),
                ),
              ),
            },
            department: department._id,
          }).select('_id name code academicYear')
        : [],
    ]);

    /*
     * Use Section.mentor as the source of truth for section
     * ownership, even if a legacy User array is stale.
     */
    const mentorsWithCanonicalSections = mentors.map((mentor) => ({
      ...mentor,
      assignedSections: canonicalSections
        .filter((section) => sameId(section.mentor, mentor._id))
        .map((section) => section._id),
    }));

    const allBatchIds = uniqueIds([
      ...mentorBatches.map((batch) => String(batch._id)),
      ...canonicalSections.map((section) => String(section.batch)),
    ]);

    const allBatches = allBatchIds.length
      ? await Batch.find({
          _id: { $in: allBatchIds },
          department: department._id,
        }).select('_id name code academicYear')
      : [];

    return res.status(200).json({
      success: true,
      message: 'Mentors retrieved successfully.',
      data: {
        mentors: mentorsWithCanonicalSections.map((mentor) =>
          normalizeMentor(
            mentor,
            department,
            allBatches,
            canonicalSections,
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