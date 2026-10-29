import mongoose from 'mongoose';

import {
  User,
  USER_ROLES,
  ACCOUNT_STATUSES,
} from '../models/user.model.js';

import {
  Course,
  COURSE_STATUSES,
} from '../models/course.model.js';

import {
  Assignment,
  ASSIGNMENT_CONTENT_TYPES,
  ASSIGNMENT_STATUSES,
} from '../models/assignment.model.js';

import { Department } from '../models/department.model.js';
import { Batch } from '../models/batch.model.js';
import { Section } from '../models/section.model.js';

function createControllerError(statusCode, code, message) {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.code = code;
  error.expose = true;

  return error;
}

function normalizeId(value) {
  if (!value) {
    return null;
  }

  if (value._id) {
    return value._id.toString();
  }

  return value.toString();
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeContent(item) {
  return {
    id: item._id.toString(),
    title: item.title,
    contentType:
      item.contentType || ASSIGNMENT_CONTENT_TYPES.ASSIGNMENT,
    description: item.description,

    course: item.course
      ? {
          id: normalizeId(item.course._id),
          title: item.course.title,
          code: item.course.code,
        }
      : null,

    department: item.department
      ? {
          id: normalizeId(item.department._id),
          name: item.department.name,
          code: item.department.code,
        }
      : null,

    batches: (item.batches || []).map((batch) => ({
      id: normalizeId(batch._id),
      name: batch.name,
      code: batch.code,
    })),

    sections: (item.sections || []).map((section) => ({
      id: normalizeId(section._id),
      name: section.name,
      code: section.code,
    })),

    dueDate: item.dueDate,
    totalMarks: item.totalMarks,

    attachments: (item.attachments || []).map((attachment) => ({
      name: attachment.name,
      url: attachment.url,
      mimeType: attachment.mimeType || '',
      size: attachment.size || 0,
    })),

    status: item.status,

    createdBy: item.createdBy
      ? {
          id: normalizeId(item.createdBy._id),
          fullName: item.createdBy.fullName,
          role: item.createdBy.role,
        }
      : null,

    publishedAt: item.publishedAt || null,
    closedAt: item.closedAt || null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

async function getActiveUser(userId) {
  if (!mongoose.isValidObjectId(userId)) {
    throw createControllerError(
      401,
      'INVALID_AUTHENTICATED_USER',
      'The authenticated user is invalid.',
    );
  }

  const user = await User.findOne({
    _id: userId,
    status: ACCOUNT_STATUSES.ACTIVE,
  })
    .select('_id role status department')
    .lean()
    .exec();

  if (!user) {
    throw createControllerError(
      401,
      'ACTIVE_USER_NOT_FOUND',
      'The active user account could not be found.',
    );
  }

  if (
    ![
      USER_ROLES.HOD,
      USER_ROLES.FACULTY,
      USER_ROLES.MENTOR,
    ].includes(user.role)
  ) {
    throw createControllerError(
      403,
      'CONTENT_MANAGEMENT_FORBIDDEN',
      'You do not have permission to manage assignments or practicals.',
    );
  }

  if (!user.department) {
    throw createControllerError(
      403,
      'DEPARTMENT_NOT_ASSIGNED',
      'Your account is not assigned to a department.',
    );
  }

  return user;
}

async function getActiveDepartmentForHod(user) {
  const department = await Department.findOne({
    _id: user.department,
    hod: user._id,
    status: 'ACTIVE',
  })
    .select('_id name code status hod')
    .lean()
    .exec();

  if (!department) {
    throw createControllerError(
      403,
      'HOD_DEPARTMENT_UNAVAILABLE',
      'Your active HOD department could not be verified.',
    );
  }

  return department;
}

async function getAuthorizedCourse(user, courseId) {
  if (!mongoose.isValidObjectId(courseId)) {
    throw createControllerError(
      400,
      'INVALID_COURSE_ID',
      'A valid course ID is required.',
    );
  }

  const course = await Course.findOne({
    _id: courseId,
    department: user.department,
    status: COURSE_STATUSES.ACTIVE,
  })
    .select(
      '_id title code department faculty batches sections status',
    )
    .lean()
    .exec();

  if (!course) {
    throw createControllerError(
      404,
      'COURSE_NOT_FOUND',
      'The active course was not found in your department.',
    );
  }

  if (normalizeId(course.faculty) !== user._id.toString()) {
    throw createControllerError(
      403,
      'COURSE_INSTRUCTOR_REQUIRED',
      'You can manage assignments and practicals only for subjects assigned to you.',
    );
  }

  return course;
}

async function validateTargets({
  user,
  course,
  batchIds,
  sectionIds,
}) {
  const uniqueBatchIds = [...new Set(batchIds || [])];
  const uniqueSectionIds = [...new Set(sectionIds || [])];

  for (const id of [...uniqueBatchIds, ...uniqueSectionIds]) {
    if (!mongoose.isValidObjectId(id)) {
      throw createControllerError(
        400,
        'INVALID_TARGET_ID',
        'One or more batch or section IDs are invalid.',
      );
    }
  }

  const courseBatchIds = (course.batches || []).map(normalizeId);
  const courseSectionIds = (course.sections || []).map(normalizeId);

  for (const batchId of uniqueBatchIds) {
    if (!courseBatchIds.includes(batchId)) {
      throw createControllerError(
        400,
        'BATCH_NOT_ASSIGNED_TO_COURSE',
        'Every selected batch must be assigned to the selected course.',
      );
    }
  }

  for (const sectionId of uniqueSectionIds) {
    if (!courseSectionIds.includes(sectionId)) {
      throw createControllerError(
        400,
        'SECTION_NOT_ASSIGNED_TO_COURSE',
        'Every selected section must be assigned to the selected course.',
      );
    }
  }

  if (uniqueBatchIds.length > 0) {
    const activeBatchCount = await Batch.countDocuments({
      _id: { $in: uniqueBatchIds },
      department: user.department,
      status: 'ACTIVE',
    }).exec();

    if (activeBatchCount !== uniqueBatchIds.length) {
      throw createControllerError(
        400,
        'INVALID_BATCH_SCOPE',
        'One or more selected batches are inactive or outside your department.',
      );
    }
  }

  if (uniqueSectionIds.length > 0) {
    const activeSections = await Section.find({
      _id: { $in: uniqueSectionIds },
      department: user.department,
      status: 'ACTIVE',
    })
      .select('_id batch')
      .lean()
      .exec();

    if (activeSections.length !== uniqueSectionIds.length) {
      throw createControllerError(
        400,
        'INVALID_SECTION_SCOPE',
        'One or more selected sections are inactive or outside your department.',
      );
    }

    const selectedBatchSet = new Set(uniqueBatchIds);

    for (const section of activeSections) {
      const sectionBatchId = normalizeId(section.batch);

      if (
        uniqueBatchIds.length > 0
        && !selectedBatchSet.has(sectionBatchId)
      ) {
        throw createControllerError(
          400,
          'SECTION_BATCH_MISMATCH',
          'A selected section does not belong to a selected batch.',
        );
      }
    }
  }

  return {
    batchIds: uniqueBatchIds,
    sectionIds: uniqueSectionIds,
  };
}

function buildContentQuery({ user, department, query }) {
  const filter = {
    department,
  };

  if (query.status) {
    filter.status = query.status;
  }

  if (query.contentType) {
    filter.contentType = query.contentType;
  }

  if (user.role !== USER_ROLES.HOD) {
    filter.createdBy = user._id;
  }

  if (query.courseId) {
    filter.course = query.courseId;
  }

  if (query.search) {
    const search = new RegExp(escapeRegex(query.search), 'i');

    filter.$or = [
      { title: search },
      { description: search },
    ];
  }

  return filter;
}

async function populateContent(contentId) {
  return Assignment.findById(contentId)
    .populate({
      path: 'course',
      select: 'title code',
    })
    .populate({
      path: 'department',
      select: 'name code',
    })
    .populate({
      path: 'batches',
      select: 'name code',
    })
    .populate({
      path: 'sections',
      select: 'name code batch',
    })
    .populate({
      path: 'createdBy',
      select: 'fullName role',
    })
    .lean()
    .exec();
}

function normalizeAttachments(attachments) {
  if (!Array.isArray(attachments)) {
    throw createControllerError(
      400,
      'INVALID_ATTACHMENTS',
      'Attachments must be provided as an array.',
    );
  }

  if (attachments.length > 10) {
    throw createControllerError(
      400,
      'ATTACHMENT_LIMIT_EXCEEDED',
      'An assignment can contain at most 10 attachments.',
    );
  }

  return attachments.map((attachment) => {
    if (
      !attachment
      || typeof attachment.name !== 'string'
      || typeof attachment.url !== 'string'
    ) {
      throw createControllerError(
        400,
        'INVALID_ATTACHMENT',
        'Every attachment must contain a name and URL.',
      );
    }

    const name = attachment.name.trim();
    const rawUrl = attachment.url.trim();

    if (!name || name.length > 255) {
      throw createControllerError(
        400,
        'INVALID_ATTACHMENT_NAME',
        'Attachment names must contain between 1 and 255 characters.',
      );
    }

    let parsedUrl;

    try {
      parsedUrl = new URL(rawUrl);
    } catch {
      throw createControllerError(
        400,
        'INVALID_ATTACHMENT_URL',
        'Every attachment must have a valid URL.',
      );
    }

    if (!['https:', 'http:'].includes(parsedUrl.protocol)) {
      throw createControllerError(
        400,
        'INVALID_ATTACHMENT_URL',
        'Attachment URLs must use HTTP or HTTPS.',
      );
    }

    const size = Number(attachment.size || 0);

    if (!Number.isFinite(size) || size < 0) {
      throw createControllerError(
        400,
        'INVALID_ATTACHMENT_SIZE',
        'Attachment size must be zero or a positive number.',
      );
    }

    return {
      name,
      url: parsedUrl.toString(),
      mimeType: String(attachment.mimeType || '').trim(),
      size,
    };
  });
}

export async function listDepartmentContentController(
  req,
  res,
  next,
) {
  try {
    const user = await getActiveUser(req.user?.id);

    let departmentId = user.department;

    if (user.role === USER_ROLES.HOD) {
      const department = await getActiveDepartmentForHod(user);
      departmentId = department._id;
    }

    const page = Number.parseInt(req.query.page, 10) || 1;
    const limit = Number.parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const filter = buildContentQuery({
      user,
      department: departmentId,
      query: req.query,
    });

    const [items, total] = await Promise.all([
      Assignment.find(filter)
        .populate({
          path: 'course',
          select: 'title code',
        })
        .populate({
          path: 'department',
          select: 'name code',
        })
        .populate({
          path: 'batches',
          select: 'name code',
        })
        .populate({
          path: 'sections',
          select: 'name code batch',
        })
        .populate({
          path: 'createdBy',
          select: 'fullName role',
        })
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),

      Assignment.countDocuments(filter).exec(),
    ]);

    return res.status(200).json({
      success: true,
      message: 'Assignments and practicals retrieved successfully.',
      data: {
        items: items.map(normalizeContent),
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

export async function createDepartmentContentController(
  req,
  res,
  next,
) {
  try {
    const user = await getActiveUser(req.user?.id);

    if (user.role === USER_ROLES.HOD) {
      await getActiveDepartmentForHod(user);
    }

    const {
      title,
      contentType = ASSIGNMENT_CONTENT_TYPES.ASSIGNMENT,
      description,
      courseId,
      batchIds = [],
      sectionIds = [],
      dueDate,
      totalMarks,
      attachments = [],
      status = ASSIGNMENT_STATUSES.DRAFT,
    } = req.body;

    if (
      !Object.values(ASSIGNMENT_CONTENT_TYPES).includes(contentType)
    ) {
      throw createControllerError(
        400,
        'INVALID_CONTENT_TYPE',
        'Content type must be ASSIGNMENT or PRACTICAL.',
      );
    }

    if (!Object.values(ASSIGNMENT_STATUSES).includes(status)) {
      throw createControllerError(
        400,
        'INVALID_CONTENT_STATUS',
        'The requested content status is invalid.',
      );
    }

    const parsedDueDate = new Date(dueDate);

    if (
      !dueDate
      || Number.isNaN(parsedDueDate.getTime())
    ) {
      throw createControllerError(
        400,
        'INVALID_DUE_DATE',
        'A valid due date is required.',
      );
    }

    if (parsedDueDate.getTime() <= Date.now()) {
      throw createControllerError(
        400,
        'DUE_DATE_MUST_BE_FUTURE',
        'The due date must be in the future.',
      );
    }

    if (
      !Number.isFinite(Number(totalMarks))
      || Number(totalMarks) < 1
      || Number(totalMarks) > 10000
    ) {
      throw createControllerError(
        400,
        'INVALID_TOTAL_MARKS',
        'Total marks must be between 1 and 10000.',
      );
    }

    const course = await getAuthorizedCourse(user, courseId);

    const targets = await validateTargets({
      user,
      course,
      batchIds,
      sectionIds,
    });

    const normalizedAttachments = normalizeAttachments(attachments);

    const now = new Date();

    const content = await Assignment.create({
      title: title.trim(),
      contentType,
      description: description.trim(),
      course: course._id,
      department: user.department,
      batches: targets.batchIds,
      sections: targets.sectionIds,
      dueDate: parsedDueDate,
      totalMarks: Number(totalMarks),
      attachments: normalizedAttachments,
      status,
      createdBy: user._id,
      publishedAt:
        status === ASSIGNMENT_STATUSES.PUBLISHED ? now : null,
      closedAt:
        status === ASSIGNMENT_STATUSES.CLOSED ? now : null,
    });

    const populatedContent = await populateContent(content._id);

    return res.status(201).json({
      success: true,
      message:
        contentType === ASSIGNMENT_CONTENT_TYPES.PRACTICAL
          ? 'Practical created successfully.'
          : 'Assignment created successfully.',
      data: {
        item: normalizeContent(populatedContent),
      },
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Update an existing assignment or practical.
 *
 * Route middleware will validate the request and, for multipart
 * uploads, provide successfully uploaded attachment metadata through
 * req.uploadedAttachments.
 *
 * If `attachments` is supplied, it represents the desired list of
 * existing URL attachments. Newly uploaded attachments are appended.
 * If `attachments` is omitted, the current attachments are retained
 * and newly uploaded files are appended.
 */
export async function updateDepartmentContentController(
  req,
  res,
  next,
) {
  try {
    const user = await getActiveUser(req.user?.id);
    const { assignmentId } = req.params;

    if (!mongoose.isValidObjectId(assignmentId)) {
      throw createControllerError(
        400,
        'INVALID_ASSIGNMENT_ID',
        'A valid assignment ID is required.',
      );
    }

    let departmentId = user.department;

    if (user.role === USER_ROLES.HOD) {
      const department = await getActiveDepartmentForHod(user);
      departmentId = department._id;
    }

    const assignmentFilter = {
      _id: assignmentId,
      department: departmentId,
    };

    if (user.role !== USER_ROLES.HOD) {
      assignmentFilter.createdBy = user._id;
    }

    const assignment = await Assignment.findOne(assignmentFilter)
      .exec();

    if (!assignment) {
      throw createControllerError(
        404,
        'ASSIGNMENT_NOT_FOUND',
        'The assignment was not found in your permitted department scope.',
      );
    }

    const body = req.body || {};

    const nextTitle = body.title === undefined
      ? assignment.title
      : String(body.title).trim();

    const nextDescription = body.description === undefined
      ? assignment.description
      : String(body.description).trim();

    const nextContentType = body.contentType === undefined
      ? assignment.contentType
      : body.contentType;

    const nextStatus = body.status === undefined
      ? assignment.status
      : body.status;

    if (nextTitle.length < 2 || nextTitle.length > 200) {
      throw createControllerError(
        400,
        'INVALID_ASSIGNMENT_TITLE',
        'The title must contain between 2 and 200 characters.',
      );
    }

    if (
      nextDescription.length < 1
      || nextDescription.length > 10000
    ) {
      throw createControllerError(
        400,
        'INVALID_ASSIGNMENT_DESCRIPTION',
        'The description must contain between 1 and 10000 characters.',
      );
    }

    if (
      !Object.values(ASSIGNMENT_CONTENT_TYPES).includes(
        nextContentType,
      )
    ) {
      throw createControllerError(
        400,
        'INVALID_CONTENT_TYPE',
        'Content type must be ASSIGNMENT or PRACTICAL.',
      );
    }

    if (
      !Object.values(ASSIGNMENT_STATUSES).includes(nextStatus)
    ) {
      throw createControllerError(
        400,
        'INVALID_CONTENT_STATUS',
        'The requested content status is invalid.',
      );
    }

    const courseId = body.courseId === undefined
      ? normalizeId(assignment.course)
      : body.courseId;

    const course = await getAuthorizedCourse(user, courseId);

    const batchIds = body.batchIds === undefined
      ? assignment.batches.map(normalizeId)
      : body.batchIds;

    const sectionIds = body.sectionIds === undefined
      ? assignment.sections.map(normalizeId)
      : body.sectionIds;

    if (
      !Array.isArray(batchIds)
      || !Array.isArray(sectionIds)
    ) {
      throw createControllerError(
        400,
        'INVALID_ASSIGNMENT_TARGETS',
        'Batch IDs and section IDs must be arrays.',
      );
    }

    const targets = await validateTargets({
      user,
      course,
      batchIds,
      sectionIds,
    });

    const dueDate = body.dueDate === undefined
      ? assignment.dueDate
      : new Date(body.dueDate);

    if (
      !(dueDate instanceof Date)
      || Number.isNaN(dueDate.getTime())
    ) {
      throw createControllerError(
        400,
        'INVALID_DUE_DATE',
        'A valid due date is required.',
      );
    }

    if (
      body.dueDate !== undefined
      && dueDate.getTime() <= Date.now()
    ) {
      throw createControllerError(
        400,
        'DUE_DATE_MUST_BE_FUTURE',
        'The due date must be in the future.',
      );
    }

    const totalMarks = body.totalMarks === undefined
      ? assignment.totalMarks
      : Number(body.totalMarks);

    if (
      !Number.isFinite(totalMarks)
      || totalMarks < 1
      || totalMarks > 10000
    ) {
      throw createControllerError(
        400,
        'INVALID_TOTAL_MARKS',
        'Total marks must be between 1 and 10000.',
      );
    }

    let requestedAttachments = assignment.attachments.map(
      (attachment) => ({
        name: attachment.name,
        url: attachment.url,
        mimeType: attachment.mimeType || '',
        size: attachment.size || 0,
      }),
    );

    if (body.attachments !== undefined) {
      let parsedAttachments = body.attachments;

      if (typeof parsedAttachments === 'string') {
        try {
          parsedAttachments = JSON.parse(parsedAttachments);
        } catch {
          throw createControllerError(
            400,
            'INVALID_ATTACHMENTS_JSON',
            'The attachments field must contain a valid JSON array.',
          );
        }
      }

      requestedAttachments = normalizeAttachments(parsedAttachments);
    }

    const uploadedAttachments = Array.isArray(req.uploadedAttachments)
      ? req.uploadedAttachments
      : [];

    const combinedAttachments = normalizeAttachments([
      ...requestedAttachments,
      ...uploadedAttachments,
    ]);

    if (combinedAttachments.length > 10) {
      throw createControllerError(
        400,
        'ATTACHMENT_LIMIT_EXCEEDED',
        'An assignment can contain at most 10 attachments.',
      );
    }

    assignment.title = nextTitle;
    assignment.contentType = nextContentType;
    assignment.description = nextDescription;
    assignment.course = course._id;
    assignment.batches = targets.batchIds;
    assignment.sections = targets.sectionIds;
    assignment.dueDate = dueDate;
    assignment.totalMarks = totalMarks;
    assignment.attachments = combinedAttachments;
    assignment.status = nextStatus;

    if (nextStatus === ASSIGNMENT_STATUSES.PUBLISHED) {
      assignment.publishedAt = assignment.publishedAt || new Date();
      assignment.closedAt = null;
    } else if (nextStatus === ASSIGNMENT_STATUSES.CLOSED) {
      assignment.closedAt = assignment.closedAt || new Date();
    } else {
      assignment.publishedAt = null;
      assignment.closedAt = null;
    }

    await assignment.save();

    const populatedAssignment = await populateContent(assignment._id);

    return res.status(200).json({
      success: true,
      message:
        nextContentType === ASSIGNMENT_CONTENT_TYPES.PRACTICAL
          ? 'Practical updated successfully.'
          : 'Assignment updated successfully.',
      data: {
        item: normalizeContent(populatedAssignment),
      },
    });
  } catch (error) {
    return next(error);
  }
}