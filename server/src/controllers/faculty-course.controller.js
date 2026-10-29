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

function normalizeAssignedCourse(course) {
  return {
    id: course._id.toString(),
    title: course.title,
    code: course.code,
    description: course.description || '',
    semester: course.semester || '',
    category: course.category,
    credits: course.credits,
    status: course.status,

    department: course.department
      ? {
          id: normalizeId(course.department._id),
          name: course.department.name,
          code: course.department.code,
        }
      : null,

    batches: (course.batches || []).map((batch) => ({
      id: normalizeId(batch._id),
      name: batch.name,
      code: batch.code,
      academicYear: batch.academicYear || '',
    })),

    sections: (course.sections || []).map((section) => ({
      id: normalizeId(section._id),
      name: section.name,
      code: section.code,
      batch: normalizeId(section.batch),
    })),

    instructor: course.faculty
      ? {
          id: normalizeId(course.faculty._id),
          fullName: course.faculty.fullName,
          role: course.faculty.role,
        }
      : null,
  };
}

export async function listMyAssignedCoursesController(
  req,
  res,
  next,
) {
  try {
    const userId = req.user?.id;

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
      .select('_id role department status')
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
        USER_ROLES.FACULTY,
        USER_ROLES.HOD,
      ].includes(user.role)
    ) {
      throw createControllerError(
        403,
        'ASSIGNED_COURSES_FORBIDDEN',
        'Only Faculty and HOD accounts can access their assigned courses.',
      );
    }

    if (!user.department) {
      throw createControllerError(
        403,
        'DEPARTMENT_NOT_ASSIGNED',
        'Your account is not assigned to a department.',
      );
    }

    if (user.role === USER_ROLES.HOD) {
      const department = await Department.findOne({
        _id: user.department,
        hod: user._id,
        status: 'ACTIVE',
      })
        .select('_id')
        .lean()
        .exec();

      if (!department) {
        throw createControllerError(
          403,
          'HOD_DEPARTMENT_UNAVAILABLE',
          'Your active HOD department could not be verified.',
        );
      }
    }

    const courses = await Course.find({
      department: user.department,
      faculty: user._id,
      status: COURSE_STATUSES.ACTIVE,
    })
      .populate({
        path: 'department',
        select: 'name code',
      })
      .populate({
        path: 'faculty',
        select: 'fullName role',
      })
      .populate({
        path: 'batches',
        select: 'name code academicYear',
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

    return res.status(200).json({
      success: true,
      message: 'Assigned courses retrieved successfully.',
      data: {
        courses: courses.map(normalizeAssignedCourse),
        total: courses.length,
      },
    });
  } catch (error) {
    return next(error);
  }
}