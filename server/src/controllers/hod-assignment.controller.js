import mongoose from 'mongoose';

import {
  User,
  USER_ROLES,
  ACCOUNT_STATUSES,
} from '../models/user.model.js';

import { Department } from '../models/department.model.js';
import { Course, COURSE_STATUSES } from '../models/course.model.js';
import { Batch } from '../models/batch.model.js';
import { Section } from '../models/section.model.js';

import {
  Assignment,
  ASSIGNMENT_STATUSES,
} from '../models/assignment.model.js';

function createControllerError(
  message,
  code,
  statusCode = 400,
) {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.code = code;
  error.expose = true;

  return error;
}

function getAuthenticatedUserId(req) {
  return req.user?.id ?? req.user?._id;
}

function normalizeId(value) {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (value._id) {
    return value._id.toString();
  }

  if (typeof value.toString === 'function') {
    return value.toString();
  }

  return null;
}

function normalizeAssignment(assignment) {
  const course =
    assignment.course && typeof assignment.course === 'object'
      ? assignment.course
      : null;

  return {
    id: assignment._id.toString(),
    title: assignment.title,
    description: assignment.description,

    course: course
      ? {
          id: course._id.toString(),
          title: course.title,
          code: course.code,
        }
      : null,

    courseName: course?.title || '',
    courseCode: course?.code || '',

    batches: (assignment.batches || []).map((batch) => {
      if (!batch || typeof batch !== 'object') {
        return {
          id: normalizeId(batch),
          name: '',
          code: '',
        };
      }

      return {
        id: normalizeId(batch),
        name: batch.name || '',
        code: batch.code || '',
      };
    }),

    sections: (assignment.sections || []).map((section) => {
      if (!section || typeof section !== 'object') {
        return {
          id: normalizeId(section),
          name: '',
          code: '',
        };
      }

      return {
        id: normalizeId(section),
        name: section.name || '',
        code: section.code || '',
        batch:
          section.batch && typeof section.batch === 'object'
            ? {
                id: normalizeId(section.batch),
                name: section.batch.name || '',
                code: section.batch.code || '',
              }
            : null,
      };
    }),

    dueDate: assignment.dueDate,
    totalMarks: assignment.totalMarks,

    attachments: (assignment.attachments || []).map(
      (attachment) => ({
        name: attachment.name,
        url: attachment.url,
        mimeType: attachment.mimeType || '',
        size: attachment.size ?? 0,
      }),
    ),

    status: assignment.status,
    publishedAt: assignment.publishedAt || null,
    closedAt: assignment.closedAt || null,

    createdBy: normalizeId(assignment.createdBy),
    createdAt: assignment.createdAt,
    updatedAt: assignment.updatedAt,
  };
}

async function getActiveHodDepartment(userId) {
  if (!mongoose.isValidObjectId(userId)) {
    throw createControllerError(
      'Authentication is required.',
      'AUTHENTICATION_REQUIRED',
      401,
    );
  }

  const hod = await User.findOne({
    _id: userId,
    role: USER_ROLES.HOD,
    status: ACCOUNT_STATUSES.ACTIVE,
  })
    .select('_id department role status')
    .lean()
    .exec();

  if (!hod) {
    throw createControllerError(
      'An active HOD account is required.',
      'HOD_NOT_FOUND',
      403,
    );
  }

  if (!hod.department) {
    throw createControllerError(
      'Your account is not associated with a department.',
      'HOD_DEPARTMENT_NOT_FOUND',
      409,
    );
  }

  const department = await Department.findOne({
    _id: hod.department,
    hod: hod._id,
    status: 'ACTIVE',
  })
    .select('_id name code')
    .lean()
    .exec();

  if (!department) {
    throw createControllerError(
      'Your active department could not be verified.',
      'HOD_DEPARTMENT_NOT_FOUND',
      403,
    );
  }

  return {
    hod,
    department,
  };
}

function normalizeObjectIdList(values = []) {
  const normalized = values.map((value) => String(value));

  return [...new Set(normalized)];
}

async function validateCourseAndTargets({
  departmentId,
  courseId,
  batchIds,
  sectionIds,
}) {
  if (!mongoose.isValidObjectId(courseId)) {
    throw createControllerError(
      'Select a valid course.',
      'INVALID_COURSE_ID',
    );
  }

  const course = await Course.findOne({
    _id: courseId,
    department: departmentId,
    status: COURSE_STATUSES.ACTIVE,
  })
    .select('_id title code department faculty batches sections status')
    .lean()
    .exec();

  if (!course) {
    throw createControllerError(
      'The selected course is not active in your department.',
      'COURSE_NOT_FOUND',
      404,
    );
  }

  const normalizedBatchIds = normalizeObjectIdList(batchIds);
  const normalizedSectionIds = normalizeObjectIdList(sectionIds);

  for (const id of [...normalizedBatchIds, ...normalizedSectionIds]) {
    if (!mongoose.isValidObjectId(id)) {
      throw createControllerError(
        'One or more batch or section IDs are invalid.',
        'INVALID_ASSIGNMENT_TARGET',
      );
    }
  }

  let batches = [];

  if (normalizedBatchIds.length > 0) {
    batches = await Batch.find({
      _id: { $in: normalizedBatchIds },
      department: departmentId,
      status: 'ACTIVE',
    })
      .select('_id department status')
      .lean()
      .exec();

    if (batches.length !== normalizedBatchIds.length) {
      throw createControllerError(
        'One or more selected batches are not active in your department.',
        'INVALID_BATCH_ASSIGNMENT',
      );
    }
  }

  let sections = [];

  if (normalizedSectionIds.length > 0) {
    sections = await Section.find({
      _id: { $in: normalizedSectionIds },
      department: departmentId,
      status: 'ACTIVE',
    })
      .select('_id department batch status')
      .lean()
      .exec();

    if (sections.length !== normalizedSectionIds.length) {
      throw createControllerError(
        'One or more selected sections are not active in your department.',
        'INVALID_SECTION_ASSIGNMENT',
      );
    }
  }

  const courseBatchIds = new Set(
    (course.batches || []).map((id) => normalizeId(id)),
  );

  const courseSectionIds = new Set(
    (course.sections || []).map((id) => normalizeId(id)),
  );

  const incompatibleBatch = batches.find(
    (batch) => !courseBatchIds.has(normalizeId(batch._id)),
  );

  if (incompatibleBatch) {
    throw createControllerError(
      'Every selected batch must already be assigned to the course.',
      'COURSE_BATCH_MISMATCH',
    );
  }

  const incompatibleSection = sections.find(
    (section) => !courseSectionIds.has(normalizeId(section._id)),
  );

  if (incompatibleSection) {
    throw createControllerError(
      'Every selected section must already be assigned to the course.',
      'COURSE_SECTION_MISMATCH',
    );
  }

  for (const section of sections) {
    if (
      normalizedBatchIds.length > 0 &&
      !normalizedBatchIds.includes(normalizeId(section.batch))
    ) {
      throw createControllerError(
        'Each selected section must belong to one of the selected batches.',
        'SECTION_BATCH_MISMATCH',
      );
    }
  }

  return {
    course,
    batchIds: normalizedBatchIds,
    sectionIds: normalizedSectionIds,
  };
}

/**
 * GET /api/v1/assignments/department
 *
 * Lists assignments belonging to the authenticated HOD's department.
 */
export async function listDepartmentAssignmentsController(
  req,
  res,
  next,
) {
  try {
    const { department } = await getActiveHodDepartment(
      getAuthenticatedUserId(req),
    );

    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 20),
    );

    const search =
      typeof req.query.search === 'string'
        ? req.query.search.trim()
        : '';

    const status = req.query.status;

    const filter = {
      department: department._id,
    };

    if (status) {
      if (!Object.values(ASSIGNMENT_STATUSES).includes(status)) {
        throw createControllerError(
          'The requested assignment status is invalid.',
          'INVALID_ASSIGNMENT_STATUS',
        );
      }

      filter.status = status;
    }

    if (search) {
      const escapedSearch = search.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&',
      );

      const matchingCourses = await Course.find({
        department: department._id,
        $or: [
          { title: { $regex: escapedSearch, $options: 'i' } },
          { code: { $regex: escapedSearch, $options: 'i' } },
        ],
      })
        .select('_id')
        .lean()
        .exec();

      const courseIds = matchingCourses.map((course) => course._id);

      filter.$or = [
        { title: { $regex: escapedSearch, $options: 'i' } },
        { course: { $in: courseIds } },
      ];
    }

    const skip = (page - 1) * limit;

    const [assignments, total] = await Promise.all([
      Assignment.find(filter)
        .populate({
          path: 'course',
          select: 'title code department status',
        })
        .populate({
          path: 'batches',
          select: 'name code academicYear',
        })
        .populate({
          path: 'sections',
          select: 'name code batch',
          populate: {
            path: 'batch',
            select: 'name code',
          },
        })
        .sort({
          createdAt: -1,
          _id: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),

      Assignment.countDocuments(filter).exec(),
    ]);

    const normalizedAssignments = assignments.map(normalizeAssignment);

    return res.status(200).json({
      success: true,
      data: {
        assignments: normalizedAssignments,
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
 * POST /api/v1/assignments/department
 *
 * Creates an assignment within the authenticated HOD's department.
 */
export async function createDepartmentAssignmentController(
  req,
  res,
  next,
) {
  try {
    const userId = getAuthenticatedUserId(req);

    const { hod, department } = await getActiveHodDepartment(userId);

    const {
      title,
      description,
      courseId,
      batchIds = [],
      sectionIds = [],
      dueDate,
      totalMarks,
      attachments = [],
      status = ASSIGNMENT_STATUSES.DRAFT,
    } = req.body;

    if (!Object.values(ASSIGNMENT_STATUSES).includes(status)) {
      throw createControllerError(
        'Select a valid assignment status.',
        'INVALID_ASSIGNMENT_STATUS',
      );
    }

    if (
      !Array.isArray(attachments) ||
      attachments.length > 10
    ) {
      throw createControllerError(
        'An assignment can have at most 10 attachments.',
        'INVALID_ATTACHMENTS',
      );
    }

    for (const attachment of attachments) {
      if (
        !attachment ||
        typeof attachment.name !== 'string' ||
        !attachment.name.trim() ||
        typeof attachment.url !== 'string' ||
        !attachment.url.trim()
      ) {
        throw createControllerError(
          'Every attachment must include a name and URL.',
          'INVALID_ATTACHMENT',
        );
      }

      let parsedUrl;

      try {
        parsedUrl = new URL(attachment.url);
      } catch {
        throw createControllerError(
          'Every attachment must have a valid URL.',
          'INVALID_ATTACHMENT_URL',
        );
      }

      if (!['https:', 'http:'].includes(parsedUrl.protocol)) {
        throw createControllerError(
          'Attachment URLs must use HTTP or HTTPS.',
          'INVALID_ATTACHMENT_URL',
        );
      }
    }

    const parsedDueDate = new Date(dueDate);

    if (
      typeof dueDate !== 'string' ||
      !dueDate.trim() ||
      Number.isNaN(parsedDueDate.getTime())
    ) {
      throw createControllerError(
        'Provide a valid assignment due date.',
        'INVALID_DUE_DATE',
      );
    }

    const parsedTotalMarks = Number(totalMarks);

    if (
      !Number.isFinite(parsedTotalMarks) ||
      parsedTotalMarks < 1 ||
      parsedTotalMarks > 10000
    ) {
      throw createControllerError(
        'Total marks must be between 1 and 10000.',
        'INVALID_TOTAL_MARKS',
      );
    }

    const {
      course,
      batchIds: validatedBatchIds,
      sectionIds: validatedSectionIds,
    } = await validateCourseAndTargets({
      departmentId: department._id,
      courseId,
      batchIds,
      sectionIds,
    });

    const assignment = await Assignment.create({
      title: title.trim(),
      description: description.trim(),
      course: course._id,
      department: department._id,
      batches: validatedBatchIds,
      sections: validatedSectionIds,
      dueDate: parsedDueDate,
      totalMarks: parsedTotalMarks,
      attachments: attachments.map((attachment) => ({
        name: attachment.name.trim(),
        url: attachment.url.trim(),
        mimeType: attachment.mimeType || '',
        size: Number(attachment.size) || 0,
      })),
      status,
      createdBy: hod._id,
      publishedAt:
        status === ASSIGNMENT_STATUSES.PUBLISHED
          ? new Date()
          : null,
      closedAt:
        status === ASSIGNMENT_STATUSES.CLOSED
          ? new Date()
          : null,
    });

    const populatedAssignment = await Assignment.findById(
      assignment._id,
    )
      .populate({
        path: 'course',
        select: 'title code department status',
      })
      .populate({
        path: 'batches',
        select: 'name code academicYear',
      })
      .populate({
        path: 'sections',
        select: 'name code batch',
        populate: {
          path: 'batch',
          select: 'name code',
        },
      })
      .lean()
      .exec();

    return res.status(201).json({
      success: true,
      message: 'Assignment created successfully.',
      data: {
        assignment: normalizeAssignment(populatedAssignment),
      },
    });
  } catch (error) {
    return next(error);
  }
}