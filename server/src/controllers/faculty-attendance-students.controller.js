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

import { Department } from '../models/department.model.js';

import {
  buildRoleQuery,
  hasUserRole,
} from '../utils/role-access.util.js';

function createControllerError(statusCode, code, message) {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.code = code;
  error.expose = true;

  return error;
}

function getAuthenticatedFacultyId(req) {
  const userId = req.user?.id || req.user?._id;

  if (!userId || !mongoose.isValidObjectId(userId)) {
    return null;
  }

  return new mongoose.Types.ObjectId(userId);
}

function normalizeObjectId(value) {
  if (!mongoose.isValidObjectId(value)) {
    throw createControllerError(
      400,
      'INVALID_COURSE_ID',
      'A valid course ID is required.',
    );
  }

  return new mongoose.Types.ObjectId(value);
}

async function getAuthenticatedFaculty(req) {
  const facultyId = getAuthenticatedFacultyId(req);

  if (!facultyId) {
    throw createControllerError(
      401,
      'INVALID_AUTHENTICATED_USER',
      'A valid authenticated Faculty, Mentor, or HOD account is required.',
    );
  }

  const faculty = await User.findOne({
    _id: facultyId,
    ...buildRoleQuery(
      USER_ROLES.FACULTY,
      USER_ROLES.MENTOR,
      USER_ROLES.HOD,
    ),
    status: ACCOUNT_STATUSES.ACTIVE,
  })
    .select('_id department role roles')
    .lean()
    .exec();

  if (!faculty) {
    throw createControllerError(
      401,
      'ACTIVE_TEACHING_USER_NOT_FOUND',
      'The active Faculty, Mentor, or HOD account could not be found.',
    );
  }

  if (!faculty.department) {
    throw createControllerError(
      403,
      'TEACHING_DEPARTMENT_REQUIRED',
      'Your teaching account is not assigned to a department.',
    );
  }

  if (hasUserRole(faculty, USER_ROLES.HOD)) {
    const department = await Department.findOne({
      _id: faculty.department,
      hod: faculty._id,
      status: 'ACTIVE',
    })
      .select('_id')
      .lean()
      .exec();

    if (!department) {
      throw createControllerError(
        403,
        'HOD_DEPARTMENT_UNAVAILABLE',
        'Your active HOD department assignment could not be verified.',
      );
    }
  }

  return faculty;
}

export async function listFacultyAttendanceStudentsController(
  req,
  res,
  next,
) {
  try {
    const faculty = await getAuthenticatedFaculty(req);

    const courseId = normalizeObjectId(
      req.params.courseId,
    );

    const course = await Course.findOne({
      _id: courseId,
      faculty: faculty._id,
      department: faculty.department,
      status: COURSE_STATUSES.ACTIVE,
    })
      .select('_id title code department batches sections')
      .lean()
      .exec();

    if (!course) {
      throw createControllerError(
        404,
        'ASSIGNED_COURSE_NOT_FOUND',
        'The requested active course was not found among your assigned courses.',
      );
    }

    const batchIds = course.batches || [];
    const sectionIds = course.sections || [];

    if (!batchIds.length && !sectionIds.length) {
      return res.status(200).json({
        success: true,
        data: {
          course: {
            id: String(course._id),
            title: course.title,
            code: course.code,
          },
          items: [],
          total: 0,
        },
      });
    }

    const studentScope = {
      department: course.department,
      role: USER_ROLES.STUDENT,
      status: ACCOUNT_STATUSES.ACTIVE,
    };

    // Apply every configured course placement constraint.
    // This matches the attendance listing and marking controllers.
    if (batchIds.length) {
      studentScope.assignedBatches = {
        $in: batchIds,
      };
    }

    if (sectionIds.length) {
      studentScope.assignedSections = {
        $in: sectionIds,
      };
    }

    const students = await User.find(studentScope)
      .select(
        '_id institutionalId fullName assignedBatches assignedSections',
      )
      .sort({
        fullName: 1,
        institutionalId: 1,
      })
      .lean()
      .exec();

    const courseBatchIds = new Set(
      batchIds.map(String),
    );

    const courseSectionIds = new Set(
      sectionIds.map(String),
    );

    const items = students.map((student) => {
      const batchId = (student.assignedBatches || []).find(
        (id) => courseBatchIds.has(String(id)),
      );

      const sectionId = (student.assignedSections || []).find(
        (id) => courseSectionIds.has(String(id)),
      );

      return {
        id: String(student._id),
        institutionalId: student.institutionalId,
        fullName: student.fullName,
        batchId: batchId ? String(batchId) : null,
        sectionId: sectionId ? String(sectionId) : null,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        course: {
          id: String(course._id),
          title: course.title,
          code: course.code,
        },
        items,
        total: items.length,
      },
    });
  } catch (error) {
    return next(error);
  }
}