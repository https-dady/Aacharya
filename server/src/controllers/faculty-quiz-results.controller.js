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

import { Quiz } from '../models/quiz.model.js';

import {
  QuizAttempt,
  QUIZ_ATTEMPT_STATUSES,
} from '../models/quiz-attempt.model.js';

function createControllerError(
  statusCode,
  code,
  message,
) {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.code = code;
  error.expose = true;

  return error;
}

function normalizeId(value) {
  if (!value) return null;

  return String(value._id ?? value);
}

function getAuthenticatedUserId(req) {
  const userId = req.user?._id ?? req.user?.id;

  if (!mongoose.isValidObjectId(userId)) {
    throw createControllerError(
      401,
      'INVALID_AUTHENTICATED_USER',
      'A valid authenticated Faculty account is required.',
    );
  }

  return userId;
}

function normalizePagination(query) {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 20);

  if (
    !Number.isInteger(page)
    || page < 1
    || page > 100000
    || !Number.isInteger(limit)
    || limit < 1
    || limit > 100
  ) {
    throw createControllerError(
      422,
      'INVALID_PAGINATION',
      'Page must be positive and limit must be between 1 and 100.',
    );
  }

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

async function getActiveFaculty(facultyId) {
  const faculty = await User.findOne({
    _id: facultyId,
    role: USER_ROLES.FACULTY,
    status: ACCOUNT_STATUSES.ACTIVE,
  })
    .select('_id role department status')
    .lean()
    .exec();

  if (!faculty) {
    throw createControllerError(
      403,
      'FACULTY_ACCOUNT_REQUIRED',
      'An active Faculty account is required to access quiz results.',
    );
  }

  if (!faculty.department) {
    throw createControllerError(
      403,
      'DEPARTMENT_NOT_ASSIGNED',
      'Your Faculty account is not assigned to a department.',
    );
  }

  return faculty;
}

function normalizeAttemptResult(attempt) {
  const quiz = attempt.quiz;
  const student = attempt.student;
  const course = quiz?.course;

  const obtainedMarks = (
    typeof attempt.score === 'number'
  )
    ? attempt.score
    : null;

  const totalMarks = (
    typeof attempt.totalMarks === 'number'
  )
    ? attempt.totalMarks
    : (
      typeof quiz?.totalMarks === 'number'
        ? quiz.totalMarks
        : null
    );

  const percentage = (
    obtainedMarks !== null
    && totalMarks !== null
    && totalMarks > 0
  )
    ? Number(
      ((obtainedMarks / totalMarks) * 100).toFixed(2),
    )
    : null;

  return {
    id: String(attempt._id),
    attemptId: String(attempt._id),

    status: attempt.status,

    student: student
      ? {
          id: String(student._id),
          fullName: student.fullName,
          institutionalId: student.institutionalId,
          email: student.email || null,
        }
      : null,

    quiz: quiz
      ? {
          id: String(quiz._id),
          title: quiz.title,
          status: quiz.status,
        }
      : null,

    course: course
      ? {
          id: String(course._id),
          title: course.title,
          code: course.code,
          semester: course.semester || '',
        }
      : null,

    obtainedMarks,
    totalMarks,
    percentage,

    startedAt: attempt.startedAt,
    submittedAt: attempt.submittedAt,
  };
}

/**
 * GET /api/v1/quiz-results/faculty
 *
 * Lists submitted quiz attempts for quizzes belonging to
 * courses currently assigned to the authenticated Faculty.
 *
 * Supported query parameters:
 * - page
 * - limit
 * - quizId
 * - search
 */
export async function listFacultyQuizResultsController(
  req,
  res,
  next,
) {
  try {
    const facultyId = getAuthenticatedUserId(req);

    const faculty = await getActiveFaculty(facultyId);

    const {
      page,
      limit,
      skip,
    } = normalizePagination(req.query);

    const search = String(req.query.search ?? '').trim();

    if (search.length > 100) {
      throw createControllerError(
        422,
        'INVALID_SEARCH',
        'Search cannot exceed 100 characters.',
      );
    }

    const quizId = req.query.quizId;

    if (
      quizId !== undefined
      && !mongoose.isValidObjectId(quizId)
    ) {
      throw createControllerError(
        422,
        'INVALID_QUIZ_ID',
        'A valid quiz ID is required.',
      );
    }

    /*
     * Resolve the Faculty's currently assigned active courses.
     * Quiz results from other Faculty members' courses are
     * never included in the attempt query.
     */
    const assignedCourses = await Course.find({
      department: faculty.department,
      faculty: faculty._id,
      status: COURSE_STATUSES.ACTIVE,
    })
      .select('_id')
      .lean()
      .exec();

    const assignedCourseIds = assignedCourses.map(
      (course) => course._id,
    );

    if (assignedCourseIds.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No assigned courses are available.',
        data: {
          items: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
            hasPreviousPage: false,
            hasNextPage: false,
          },
        },
      });
    }

    /*
     * Resolve quizzes only from the Faculty's assigned courses
     * and department.
     */
    const quizFilter = {
      department: faculty.department,
      course: {
        $in: assignedCourseIds,
      },
    };

    if (quizId) {
      quizFilter._id = quizId;
    }

    const accessibleQuizzes = await Quiz.find(quizFilter)
      .select('_id')
      .lean()
      .exec();

    const accessibleQuizIds = accessibleQuizzes.map(
      (quiz) => quiz._id,
    );

    if (accessibleQuizIds.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No quiz results were found.',
        data: {
          items: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
            hasPreviousPage: false,
            hasNextPage: false,
          },
        },
      });
    }

    /*
     * Only submitted attempts are academic results.
     * In-progress and expired attempts are not included.
     */
    const attemptFilter = {
      quiz: {
        $in: accessibleQuizIds,
      },
      status: QUIZ_ATTEMPT_STATUSES.SUBMITTED,
      submittedAt: {
        $ne: null,
      },
    };

    /*
     * Search matches student identity fields.
     * Quiz/course fields are searched separately below.
     */
    if (search) {
      const escapedSearch = search.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&',
      );

      const searchRegex = new RegExp(
        escapedSearch,
        'i',
      );

      const matchingStudents = await User.find({
        role: USER_ROLES.STUDENT,
        $or: [
          { fullName: searchRegex },
          { institutionalId: searchRegex },
          { email: searchRegex },
        ],
      })
        .select('_id')
        .lean()
        .exec();

      const matchingStudentIds = matchingStudents.map(
        (student) => student._id,
      );

      const matchingQuizzes = await Quiz.find({
        _id: {
          $in: accessibleQuizIds,
        },
        title: searchRegex,
      })
        .select('_id')
        .lean()
        .exec();

      const matchingQuizIds = matchingQuizzes.map(
        (quiz) => quiz._id,
      );

      const searchConditions = [];

      if (matchingStudentIds.length > 0) {
        searchConditions.push({
          student: {
            $in: matchingStudentIds,
          },
        });
      }

      if (matchingQuizIds.length > 0) {
        searchConditions.push({
          quiz: {
            $in: matchingQuizIds,
          },
        });
      }

      if (searchConditions.length === 0) {
        return res.status(200).json({
          success: true,
          message: 'No matching quiz results were found.',
          data: {
            items: [],
            pagination: {
              page,
              limit,
              total: 0,
              totalPages: 0,
              hasPreviousPage: false,
              hasNextPage: false,
            },
          },
        });
      }

      attemptFilter.$or = searchConditions;
    }

    const total = await QuizAttempt.countDocuments(
      attemptFilter,
    );

    const attempts = await QuizAttempt.find(attemptFilter)
      .select(
        'quiz student status startedAt submittedAt score totalMarks createdAt',
      )
      .populate({
        path: 'student',
        model: User,
        select: 'fullName institutionalId email role',
      })
      .populate({
        path: 'quiz',
        model: Quiz,
        select: 'title status course department totalMarks',
        populate: {
          path: 'course',
          model: Course,
          select: 'title code semester department status',
        },
      })
      .sort({
        submittedAt: -1,
        _id: -1,
      })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();

    /*
     * The quiz filter already enforces the Faculty's assigned
     * course and department. This final normalization also
     * avoids exposing incomplete populated records.
     */
    const items = attempts
      .filter((attempt) => {
        if (!attempt.quiz || !attempt.student) {
          return false;
        }

        if (
          normalizeId(attempt.quiz.department)
          !== normalizeId(faculty.department)
        ) {
          return false;
        }

        if (
          !attempt.quiz.course
          || normalizeId(attempt.quiz.course.department)
            !== normalizeId(faculty.department)
        ) {
          return false;
        }

        return true;
      })
      .map(normalizeAttemptResult);

    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      message: 'Faculty quiz results retrieved successfully.',
      data: {
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasPreviousPage: page > 1,
          hasNextPage: page < totalPages,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
}