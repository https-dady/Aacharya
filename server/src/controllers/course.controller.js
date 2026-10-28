import mongoose from 'mongoose';

import {
  User,
  USER_ROLES,
  ACCOUNT_STATUSES,
} from '../models/user.model.js';

import { Course } from '../models/course.model.js';

function createError(statusCode, code, message) {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.code = code;
  error.expose = true;

  return error;
}

function normalizeCourse(course) {
  const faculty = course.faculty;

  return {
    id: course._id.toString(),
    title: course.title,
    code: course.code,
    description: course.description || '',

    faculty: faculty
      ? {
          id: faculty._id.toString(),
          fullName: faculty.fullName,
        }
      : null,

    facultyName: faculty?.fullName || '',

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
    })),

    semester: course.semester || '',
    category: course.category.toLowerCase(),
    credits: course.credits,
    status: course.status.toLowerCase(),

    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
  };
}

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
      status: 'ACTIVE',
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
        select: 'name code',
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
            course.faculty.role !== USER_ROLES.FACULTY
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