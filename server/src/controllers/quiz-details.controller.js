import mongoose from 'mongoose';

import {
  User,
  USER_ROLES,
  ACCOUNT_STATUSES,
} from '../models/user.model.js';

import { Department } from '../models/department.model.js';

import {
  Course,
  COURSE_STATUSES,
} from '../models/course.model.js';

import { Quiz } from '../models/quiz.model.js';

import { hasUserRole } from '../utils/role-access.util.js';

function hasFacultyTeachingCapability(user) {
  return user?.role !== USER_ROLES.HOD
    && hasUserRole(user, USER_ROLES.FACULTY);
}

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

  return String(value._id ?? value.id ?? value);
}

function normalizeQuizDetails(quiz) {
  const course = quiz.course;
  const faculty = course?.faculty;

  return {
    id: String(quiz._id),

    title: quiz.title,
    description: quiz.description || '',

    course: course
      ? {
          id: normalizeId(course),
          title: course.title || '',
          code: course.code || '',
          semester: course.semester || '',

          faculty:
            faculty && typeof faculty === 'object'
              ? {
                  id: normalizeId(faculty),
                  fullName: faculty.fullName || '',
                  email: faculty.email || '',
                }
              : null,
        }
      : null,

    department: quiz.department
      ? {
          id: normalizeId(quiz.department),
          name: quiz.department.name || '',
          code: quiz.department.code || '',
        }
      : null,

    batches: (quiz.batches || []).map((batch) => ({
      id: normalizeId(batch),
      name: batch.name || '',
      code: batch.code || '',
      academicYear: batch.academicYear || '',
    })),

    sections: (quiz.sections || []).map((section) => ({
      id: normalizeId(section),
      name: section.name || '',
      code: section.code || '',
      batch: normalizeId(section.batch),
    })),

    startAt: quiz.startAt,
    endAt: quiz.endAt,
    durationMinutes: quiz.durationMinutes,
    totalMarks: quiz.totalMarks,

    questionCount: (quiz.questions || []).length,

    questions: (quiz.questions || []).map((question) => ({
      id: normalizeId(question),
      question: question.question,
      options: question.options,
      correctOptionIndex: question.correctOptionIndex,
      marks: question.marks,
    })),

    status: quiz.status,

    createdBy:
      quiz.createdBy && typeof quiz.createdBy === 'object'
        ? {
            id: normalizeId(quiz.createdBy),
            fullName: quiz.createdBy.fullName || '',
            email: quiz.createdBy.email || '',
          }
        : null,

    publishedAt: quiz.publishedAt || null,
    closedAt: quiz.closedAt || null,

    createdAt: quiz.createdAt,
    updatedAt: quiz.updatedAt,
  };
}

export async function getManagedQuizByIdController(
  req,
  res,
  next,
) {
  try {
    const { quizId } = req.params;
    const authenticatedUserId = req.user?.id;

    if (!mongoose.isValidObjectId(quizId)) {
      throw createControllerError(
        422,
        'INVALID_QUIZ_ID',
        'The supplied quiz ID is invalid.',
      );
    }

    if (!mongoose.isValidObjectId(authenticatedUserId)) {
      throw createControllerError(
        401,
        'INVALID_AUTHENTICATED_USER',
        'The authenticated user is invalid.',
      );
    }

    const actor = await User.findById(authenticatedUserId)
      .select('_id role roles status department')
      .lean()
      .exec();

    if (!actor) {
      throw createControllerError(
        401,
        'UNAUTHORIZED',
        'The authenticated account could not be found.',
      );
    }

    if (actor.status !== ACCOUNT_STATUSES.ACTIVE) {
      throw createControllerError(
        403,
        'ACCOUNT_INACTIVE',
        'Your account is not active.',
      );
    }

    if (
      actor.role !== USER_ROLES.HOD
      && !hasUserRole(actor, USER_ROLES.FACULTY)
    ) {
      throw createControllerError(
        403,
        'FORBIDDEN',
        'You are not authorized to access quiz management.',
      );
    }

    if (!actor.department) {
      throw createControllerError(
        403,
        'DEPARTMENT_NOT_ASSIGNED',
        'Your account is not assigned to a department.',
      );
    }

    const departmentFilter = {
      _id: actor.department,
      status: 'ACTIVE',
    };

    if (actor.role === USER_ROLES.HOD) {
      departmentFilter.hod = actor._id;
    }

    const department = await Department.findOne(departmentFilter)
      .select('_id name code hod')
      .lean()
      .exec();

    if (!department) {
      throw createControllerError(
        403,
        'DEPARTMENT_ACCESS_DENIED',
        'Your department assignment could not be verified.',
      );
    }

    const quizFilter = {
      _id: quizId,
      department: department._id,
    };

    if (hasFacultyTeachingCapability(actor)) {
      const assignedCourses = await Course.find({
        department: department._id,
        faculty: actor._id,
        status: COURSE_STATUSES.ACTIVE,
      })
        .select('_id')
        .lean()
        .exec();

      const assignedCourseIds = assignedCourses.map(
        (course) => course._id,
      );

      quizFilter.course = {
        $in: assignedCourseIds,
      };
    }

    const quiz = await Quiz.findOne(quizFilter)
      .populate({
        path: 'course',
        select: 'title code semester faculty',
        populate: {
          path: 'faculty',
          select: 'fullName email',
        },
      })
      .populate({
        path: 'department',
        select: 'name code',
      })
      .populate({
        path: 'batches',
        select: 'name code academicYear',
      })
      .populate({
        path: 'sections',
        select: 'name code batch',
      })
      .populate({
        path: 'createdBy',
        select: 'fullName email',
      })
      .lean()
      .exec();

    if (!quiz) {
      throw createControllerError(
        404,
        'QUIZ_NOT_FOUND',
        'The quiz does not exist or you do not have permission to access it.',
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Quiz details retrieved successfully.',
      data: {
        quiz: normalizeQuizDetails(quiz),
      },
    });
  } catch (error) {
    return next(error);
  }
}