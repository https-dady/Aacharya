import mongoose from 'mongoose';

import {
  User,
  USER_ROLES,
  ACCOUNT_STATUSES,
} from '../models/user.model.js';

import { Department } from '../models/department.model.js';
import { Batch } from '../models/batch.model.js';
import { Section } from '../models/section.model.js';

import {
  Course,
  COURSE_CATEGORIES,
  COURSE_STATUSES,
} from '../models/course.model.js';

function createError(statusCode, code, message) {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.code = code;
  error.expose = true;

  return error;
}

function normalizeCourse(course) {
  const instructor = course.faculty;

  return {
    id: course._id.toString(),
    title: course.title,
    code: course.code,
    description: course.description || '',

    faculty: instructor
      ? {
          id: instructor._id.toString(),
          fullName: instructor.fullName,
          role: instructor.role,
        }
      : null,

    facultyName: instructor?.fullName || '',

    department: course.department
      ? {
          id: course.department._id.toString(),
          name: course.department.name,
          code: course.department.code,
        }
      : null,

    batches: (course.batches || []).map((batch) => ({
      id: batch._id.toString(),
      name: batch.name,
      code: batch.code,
    })),

    sections: (course.sections || []).map((section) => ({
      id: section._id.toString(),
      name: section.name,
      code: section.code,
      batch: section.batch
        ? section.batch.toString()
        : null,
    })),

    semester: course.semester || '',
    category: String(course.category || 'CORE').toLowerCase(),
    credits: course.credits,
    status: String(course.status || 'ACTIVE').toLowerCase(),

    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
  };
}

async function getActiveHodDepartment(userId) {
  if (!mongoose.isValidObjectId(userId)) {
    throw createError(
      401,
      'INVALID_AUTHENTICATED_USER',
      'The authenticated user is invalid.',
    );
  }

  const hod = await User.findById(userId)
    .select('_id role status department')
    .exec();

  if (!hod) {
    throw createError(
      401,
      'UNAUTHORIZED',
      'The authenticated account could not be found.',
    );
  }

  if (
    hod.role !== USER_ROLES.HOD
    || hod.status !== ACCOUNT_STATUSES.ACTIVE
  ) {
    throw createError(
      403,
      'FORBIDDEN',
      'Only an active HOD can manage department courses.',
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
      'The HOD does not have a valid active department assignment.',
    );
  }

  return {
    hod,
    department,
  };
}

function normalizeObjectIdList(values, fieldName) {
  if (values === undefined || values === null) {
    return [];
  }

  if (!Array.isArray(values)) {
    throw createError(
      422,
      'INVALID_COURSE_ASSIGNMENT',
      `${fieldName} must be an array of IDs.`,
    );
  }

  const normalized = values.map((value) => String(value));

  if (normalized.some((value) => !mongoose.isValidObjectId(value))) {
    throw createError(
      422,
      'INVALID_COURSE_ASSIGNMENT',
      `${fieldName} contains an invalid ID.`,
    );
  }

  return [...new Set(normalized)];
}

async function validateCourseAssignments({
  departmentId,
  batchIds,
  sectionIds,
}) {
  let batches = [];
  let sections = [];

  if (batchIds.length > 0) {
    batches = await Batch.find({
      _id: { $in: batchIds },
      department: departmentId,
      status: 'ACTIVE',
    })
      .select('_id name code department')
      .exec();

    if (batches.length !== batchIds.length) {
      throw createError(
        422,
        'INVALID_BATCH_ASSIGNMENT',
        'Every assigned batch must be active and belong to your department.',
      );
    }
  }

  if (sectionIds.length > 0) {
    sections = await Section.find({
      _id: { $in: sectionIds },
      department: departmentId,
      status: 'ACTIVE',
    })
      .select('_id name code batch department')
      .exec();

    if (sections.length !== sectionIds.length) {
      throw createError(
        422,
        'INVALID_SECTION_ASSIGNMENT',
        'Every assigned section must be active and belong to your department.',
      );
    }

    const selectedBatchIds = new Set(
      batchIds.map((id) => id.toString()),
    );

    const sectionsWithoutSelectedBatch = sections.some(
      (section) =>
        !selectedBatchIds.has(section.batch.toString()),
    );

    if (sectionsWithoutSelectedBatch) {
      throw createError(
        422,
        'SECTION_BATCH_MISMATCH',
        'Every assigned section must belong to one of the selected batches.',
      );
    }
  }

  return {
    batches,
    sections,
  };
}

async function validateCourseInstructor({
  instructorId,
  hod,
  departmentId,
}) {
  if (
    instructorId === undefined
    || instructorId === null
    || instructorId === ''
  ) {
    return null;
  }

  if (!mongoose.isValidObjectId(instructorId)) {
    throw createError(
      422,
      'INVALID_INSTRUCTOR',
      'The selected instructor ID is invalid.',
    );
  }

  /*
   * An HOD may teach a course in their own department.
   * The HOD remains an HOD; their role is never changed.
   */
  if (instructorId.toString() === hod._id.toString()) {
    return hod._id;
  }

  const instructor = await User.findOne({
    _id: instructorId,
    department: departmentId,
    role: {
      $in: [
        USER_ROLES.FACULTY,
        USER_ROLES.MENTOR,
      ],
    },
    status: ACCOUNT_STATUSES.ACTIVE,
  })
    .select('_id')
    .exec();

  if (!instructor) {
    throw createError(
      422,
      'INVALID_INSTRUCTOR',
      'The instructor must be an active faculty member or mentor in your department.',
    );
  }

  return instructor._id;
}

/**
 * Lists courses belonging to the authenticated HOD's department.
 *
 * GET /api/v1/courses/department
 */
export async function listDepartmentCoursesController(
  req,
  res,
  next,
) {
  try {
    const { department } = await getActiveHodDepartment(
      req.user?.id,
    );

    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const search = String(req.query.search ?? '').trim();

    const filter = {
      department: department._id,
    };

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (search) {
      const escapedSearch = search.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&',
      );

      const searchRegex = new RegExp(escapedSearch, 'i');

      filter.$or = [
        { title: searchRegex },
        { code: searchRegex },
        { description: searchRegex },
      ];
    }

    const skip = (page - 1) * limit;

    const [courses, total] = await Promise.all([
      Course.find(filter)
        .select(
          [
            'title',
            'code',
            'description',
            'faculty',
            'department',
            'batches',
            'sections',
            'semester',
            'category',
            'credits',
            'status',
            'createdAt',
            'updatedAt',
          ].join(' '),
        )
        .populate({
          path: 'faculty',
          select: 'fullName role status',
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
        .sort({
          title: 1,
          _id: 1,
        })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),

      Course.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: 'Department courses retrieved successfully.',
      data: {
        courses: courses.map(normalizeCourse),

        department: {
          id: department._id.toString(),
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
 * Creates a course for the authenticated HOD's department.
 *
 * POST /api/v1/courses/department
 *
 * Expected body:
 * {
 *   title,
 *   code,
 *   description?,
 *   instructorId?,
 *   batchIds?,
 *   sectionIds?,
 *   semester?,
 *   category?,
 *   credits?
 * }
 *
 * instructorId may identify an active faculty member, mentor,
 * or the authenticated HOD themselves.
 */
export async function createDepartmentCourseController(
  req,
  res,
  next,
) {
  try {
    const { hod, department } = await getActiveHodDepartment(
      req.user?.id,
    );

    const {
      title,
      code,
      description = '',
      instructorId = null,
      batchIds: requestedBatchIds = [],
      sectionIds: requestedSectionIds = [],
      semester = '',
      category = COURSE_CATEGORIES.CORE,
      credits = 0,
    } = req.body;

    const normalizedTitle = String(title ?? '').trim();
    const normalizedCode = String(code ?? '').trim().toUpperCase();
    const normalizedDescription = String(description ?? '').trim();
    const normalizedSemester = String(semester ?? '').trim();

    if (
      normalizedTitle.length < 2
      || normalizedTitle.length > 150
    ) {
      throw createError(
        422,
        'INVALID_COURSE_TITLE',
        'Course title must contain between 2 and 150 characters.',
      );
    }

    if (
      normalizedCode.length < 2
      || normalizedCode.length > 30
      || !/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(normalizedCode)
    ) {
      throw createError(
        422,
        'INVALID_COURSE_CODE',
        'Course code must contain 2–30 uppercase letters, numbers, or hyphen-separated segments.',
      );
    }

    if (normalizedDescription.length > 2000) {
      throw createError(
        422,
        'INVALID_COURSE_DESCRIPTION',
        'Course description cannot exceed 2000 characters.',
      );
    }

    if (normalizedSemester.length > 30) {
      throw createError(
        422,
        'INVALID_COURSE_SEMESTER',
        'Semester cannot exceed 30 characters.',
      );
    }

    if (!Object.values(COURSE_CATEGORIES).includes(category)) {
      throw createError(
        422,
        'INVALID_COURSE_CATEGORY',
        'Select a valid course category.',
      );
    }

    const numericCredits = Number(credits);

    if (
      !Number.isFinite(numericCredits)
      || numericCredits < 0
      || numericCredits > 30
    ) {
      throw createError(
        422,
        'INVALID_COURSE_CREDITS',
        'Course credits must be a number between 0 and 30.',
      );
    }

    const batchIds = normalizeObjectIdList(
      requestedBatchIds,
      'batchIds',
    );

    const sectionIds = normalizeObjectIdList(
      requestedSectionIds,
      'sectionIds',
    );

    const existingCourse = await Course.findOne({
      department: department._id,
      code: normalizedCode,
    })
      .select('_id')
      .lean()
      .exec();

    if (existingCourse) {
      throw createError(
        409,
        'COURSE_CODE_ALREADY_EXISTS',
        'A course with this code already exists in your department.',
      );
    }

    const [instructor, assignments] = await Promise.all([
      validateCourseInstructor({
        instructorId,
        hod,
        departmentId: department._id,
      }),

      validateCourseAssignments({
        departmentId: department._id,
        batchIds,
        sectionIds,
      }),
    ]);

    const course = await Course.create({
      title: normalizedTitle,
      code: normalizedCode,
      description: normalizedDescription,
      department: department._id,
      faculty: instructor,
      batches: assignments.batches.map((batch) => batch._id),
      sections: assignments.sections.map((section) => section._id),
      semester: normalizedSemester,
      category,
      credits: numericCredits,
      status: COURSE_STATUSES.ACTIVE,
      createdBy: hod._id,
    });

    const populatedCourse = await Course.findById(course._id)
      .populate({
        path: 'faculty',
        select: 'fullName role status',
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
      .lean()
      .exec();

    return res.status(201).json({
      success: true,
      message: 'Course created successfully.',
      data: {
        course: normalizeCourse(populatedCourse),
      },
    });
  } catch (error) {
    if (error?.code === 11000) {
      return next(
        createError(
          409,
          'COURSE_CODE_ALREADY_EXISTS',
          'A course with this code already exists in your department.',
        ),
      );
    }

    return next(error);
  }
}

/**
 * Retrieves courses assigned to the authenticated student.
 *
 * GET /api/v1/courses/me
 */
export async function listMyCoursesController(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.user?.id)) {
      return next(
        createError(
          401,
          'INVALID_AUTHENTICATED_USER',
          'The authenticated user is invalid.',
        ),
      );
    }

    const student = await User.findOne({
      _id: req.user.id,
      role: USER_ROLES.STUDENT,
      status: ACCOUNT_STATUSES.ACTIVE,
    })
      .select(
        '_id department assignedBatches assignedSections',
      )
      .lean()
      .exec();

    if (!student) {
      return next(
        createError(
          404,
          'STUDENT_NOT_FOUND',
          'The active student account could not be found.',
        ),
      );
    }

    if (!student.department) {
      return res.status(200).json({
        success: true,
        message: 'No courses are assigned to this student yet.',
        data: {
          courses: [],
          total: 0,
        },
      });
    }

    const assignedBatches = student.assignedBatches || [];
    const assignedSections = student.assignedSections || [];

    if (
      assignedBatches.length === 0
      && assignedSections.length === 0
    ) {
      return res.status(200).json({
        success: true,
        message: 'No courses are assigned to this student yet.',
        data: {
          courses: [],
          total: 0,
        },
      });
    }

    const assignmentConditions = [];

    if (assignedBatches.length > 0) {
      assignmentConditions.push({
        batches: {
          $in: assignedBatches,
        },
      });
    }

    if (assignedSections.length > 0) {
      assignmentConditions.push({
        sections: {
          $in: assignedSections,
        },
      });
    }

    const courses = await Course.find({
      department: student.department,
      status: COURSE_STATUSES.ACTIVE,
      $or: assignmentConditions,
    })
      .select(
        [
          'title',
          'code',
          'description',
          'faculty',
          'department',
          'batches',
          'sections',
          'semester',
          'category',
          'credits',
          'status',
          'createdAt',
          'updatedAt',
        ].join(' '),
      )
      .populate({
        path: 'faculty',
        select: 'fullName role status',
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
      .sort({
        title: 1,
        _id: 1,
      })
      .lean()
      .exec();

    const visibleCourses = courses
      .filter((course) => {
        if (
          course.faculty
          && (
            ![
              USER_ROLES.FACULTY,
              USER_ROLES.MENTOR,
              USER_ROLES.HOD,
            ].includes(course.faculty.role)
            || course.faculty.status !== ACCOUNT_STATUSES.ACTIVE
          )
        ) {
          return false;
        }

        return true;
      })
      .map(normalizeCourse);

    return res.status(200).json({
      success: true,
      message: 'Student courses retrieved successfully.',
      data: {
        courses: visibleCourses,
        total: visibleCourses.length,
      },
    });
  } catch (error) {
    return next(error);
  }
}