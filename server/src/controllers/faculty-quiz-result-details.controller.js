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

function getAuthenticatedFacultyId(req) {
  const facultyId = req.user?._id ?? req.user?.id;

  if (!mongoose.isValidObjectId(facultyId)) {
    throw createControllerError(
      'A valid authenticated Faculty account is required.',
      'AUTHENTICATION_REQUIRED',
      401,
    );
  }

  return facultyId;
}

function normalizeId(value) {
  if (!value) return null;

  return String(value._id ?? value);
}

async function getActiveFaculty(facultyId) {
  const faculty = await User.findOne({
    _id: facultyId,
    role: USER_ROLES.FACULTY,
    status: ACCOUNT_STATUSES.ACTIVE,
  })
    .select('_id department role status')
    .lean()
    .exec();

  if (!faculty) {
    throw createControllerError(
      'An active Faculty account is required.',
      'FACULTY_ACCOUNT_REQUIRED',
      403,
    );
  }

  if (!faculty.department) {
    throw createControllerError(
      'Your Faculty account is not assigned to a department.',
      'DEPARTMENT_NOT_ASSIGNED',
      403,
    );
  }

  return faculty;
}

function normalizeQuestionResults(quiz, attempt) {
  const answers = new Map(
    (attempt.answers || []).map((answer) => [
      normalizeId(answer.questionId),
      answer,
    ]),
  );

  return quiz.questions.map((question, index) => {
    const answer = answers.get(String(question._id));

    const selectedOptionIndex =
      Number.isInteger(answer?.selectedOptionIndex)
        ? answer.selectedOptionIndex
        : null;

    const correctOptionIndex = question.correctOptionIndex;

    const isCorrect =
      selectedOptionIndex !== null
      && selectedOptionIndex === correctOptionIndex;

    const isAnswered = selectedOptionIndex !== null;

    return {
      questionId: String(question._id),
      questionNumber: index + 1,

      question: question.question,

      options: question.options.map((option, optionIndex) => ({
        index: optionIndex,
        text: option,
      })),

      selectedOptionIndex,

      selectedOption:
        selectedOptionIndex !== null
        && selectedOptionIndex < question.options.length
          ? question.options[selectedOptionIndex]
          : null,

      correctOptionIndex,

      correctOption:
        question.options[correctOptionIndex] ?? null,

      isAnswered,
      isCorrect,

      marks: question.marks,

      marksAwarded: isCorrect ? question.marks : 0,

      answeredAt: answer?.answeredAt ?? null,
    };
  });
}

/**
 * GET /api/v1/quiz-results/faculty/:attemptId
 *
 * Returns detailed information about one submitted quiz attempt.
 *
 * Access:
 * - Active Faculty only.
 * - Quiz must belong to an active course assigned to that Faculty.
 * - Attempt must be submitted.
 */
export async function getFacultyQuizResultDetailsController(
  req,
  res,
  next,
) {
  try {
    const facultyId = getAuthenticatedFacultyId(req);

    const { attemptId } = req.params;

    if (!mongoose.isValidObjectId(attemptId)) {
      throw createControllerError(
        'The quiz attempt ID is invalid.',
        'INVALID_ATTEMPT_ID',
        400,
      );
    }

    const faculty = await getActiveFaculty(facultyId);

    const attempt = await QuizAttempt.findOne({
      _id: attemptId,
      status: QUIZ_ATTEMPT_STATUSES.SUBMITTED,
      submittedAt: { $ne: null },
    })
      .select(
        'quiz student status startedAt expiresAt submittedAt answers score totalMarks createdAt',
      )
      .populate({
        path: 'student',
        model: User,
        select: 'fullName institutionalId email role status department',
      })
      .populate({
        path: 'quiz',
        model: Quiz,
        select: 'title description course department batches sections startAt endAt durationMinutes totalMarks questions status',
        populate: {
          path: 'course',
          model: Course,
          select: 'title name code courseCode semester department faculty status',
        },
      })
      .lean()
      .exec();

    if (!attempt || !attempt.quiz || !attempt.student) {
      throw createControllerError(
        'The submitted quiz attempt could not be found.',
        'QUIZ_ATTEMPT_NOT_FOUND',
        404,
      );
    }

    const quiz = attempt.quiz;
    const course = quiz.course;

    if (!course) {
      throw createControllerError(
        'The course associated with this quiz is unavailable.',
        'COURSE_NOT_AVAILABLE',
        404,
      );
    }

    /*
     * Enforce Faculty ownership through the actual course
     * assignment, department, and active course status.
     */
    const authorizedCourse = await Course.findOne({
      _id: course._id,
      faculty: faculty._id,
      department: faculty.department,
      status: COURSE_STATUSES.ACTIVE,
    })
      .select('_id')
      .lean()
      .exec();

    if (!authorizedCourse) {
      throw createControllerError(
        'You are not authorized to access this quiz result.',
        'QUIZ_RESULT_ACCESS_DENIED',
        403,
      );
    }

    if (
      normalizeId(quiz.department)
      !== normalizeId(faculty.department)
      || normalizeId(course.department)
      !== normalizeId(faculty.department)
    ) {
      throw createControllerError(
        'You are not authorized to access this quiz result.',
        'QUIZ_RESULT_ACCESS_DENIED',
        403,
      );
    }

    if (
      attempt.student.role !== USER_ROLES.STUDENT
      || normalizeId(attempt.student.department)
        !== normalizeId(faculty.department)
    ) {
      throw createControllerError(
        'The student record is not available within your department.',
        'STUDENT_RECORD_ACCESS_DENIED',
        403,
      );
    }

    const obtainedMarks =
      typeof attempt.score === 'number'
        ? attempt.score
        : null;

    const totalMarks =
      typeof attempt.totalMarks === 'number'
        ? attempt.totalMarks
        : quiz.totalMarks;

    const percentage =
      obtainedMarks !== null
      && totalMarks > 0
        ? Number(
          ((obtainedMarks / totalMarks) * 100).toFixed(2),
        )
        : null;

    const questionResults = normalizeQuestionResults(
      quiz,
      attempt,
    );

    const answeredQuestions = questionResults.filter(
      (question) => question.isAnswered,
    ).length;

    const correctAnswers = questionResults.filter(
      (question) => question.isCorrect,
    ).length;

    return res.status(200).json({
      success: true,
      message: 'Quiz result details retrieved successfully.',

      data: {
        attempt: {
          id: String(attempt._id),
          status: attempt.status,
          startedAt: attempt.startedAt,
          expiresAt: attempt.expiresAt,
          submittedAt: attempt.submittedAt,
        },

        student: {
          id: String(attempt.student._id),
          fullName: attempt.student.fullName,
          institutionalId: attempt.student.institutionalId,
          email: attempt.student.email || null,
        },

        quiz: {
          id: String(quiz._id),
          title: quiz.title,
          description: quiz.description,
          status: quiz.status,
          startAt: quiz.startAt,
          endAt: quiz.endAt,
          durationMinutes: quiz.durationMinutes,
        },

        course: {
          id: String(course._id),
          title: course.title || course.name,
          code: course.code || course.courseCode || '',
          semester: course.semester || '',
        },

        score: {
          obtainedMarks,
          totalMarks,
          percentage,
          answeredQuestions,
          unansweredQuestions:
            questionResults.length - answeredQuestions,
          correctAnswers,
          incorrectAnswers:
            answeredQuestions - correctAnswers,
          totalQuestions: questionResults.length,
        },

        questions: questionResults,
      },
    });
  } catch (error) {
    return next(error);
  }
}