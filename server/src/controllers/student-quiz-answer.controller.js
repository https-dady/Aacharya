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
  Quiz,
  QUIZ_STATUSES,
} from '../models/quiz.model.js';

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

function getAuthenticatedStudentId(req) {
  const studentId = req.user?._id ?? req.user?.id;

  if (!mongoose.isValidObjectId(studentId)) {
    throw createControllerError(
      'Authentication is required.',
      'AUTHENTICATION_REQUIRED',
      401,
    );
  }

  return studentId;
}

function normalizeIds(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .filter(Boolean)
    .map((value) => String(value._id ?? value));
}

function hasIntersection(first, second) {
  if (first.length === 0 || second.length === 0) {
    return false;
  }

  const allowedIds = new Set(second);

  return first.some((id) => allowedIds.has(id));
}

function studentMatchesCourseAllocation(student, course) {
  const studentBatches = normalizeIds(student.assignedBatches);
  const studentSections = normalizeIds(student.assignedSections);

  const courseBatches = normalizeIds(course.batches);
  const courseSections = normalizeIds(course.sections);

  if (
    courseBatches.length > 0
    && !hasIntersection(studentBatches, courseBatches)
  ) {
    return false;
  }

  if (
    courseSections.length > 0
    && !hasIntersection(studentSections, courseSections)
  ) {
    return false;
  }

  return true;
}

function studentMatchesQuizAssignment(student, quiz) {
  const studentBatches = normalizeIds(student.assignedBatches);
  const studentSections = normalizeIds(student.assignedSections);

  const quizBatches = normalizeIds(quiz.batches);
  const quizSections = normalizeIds(quiz.sections);

  if (
    quizBatches.length > 0
    && !hasIntersection(studentBatches, quizBatches)
  ) {
    return false;
  }

  if (
    quizSections.length > 0
    && !hasIntersection(studentSections, quizSections)
  ) {
    return false;
  }

  return true;
}

async function getActiveStudent(studentId) {
  const student = await User.findOne({
    _id: studentId,
    role: USER_ROLES.STUDENT,
    status: ACCOUNT_STATUSES.ACTIVE,
  })
    .select(
      '_id department assignedBatches assignedSections status',
    )
    .lean()
    .exec();

  if (!student) {
    throw createControllerError(
      'The active student account could not be found.',
      'STUDENT_NOT_FOUND',
      404,
    );
  }

  return student;
}

async function getOwnedAttempt(attemptId, studentId) {
  if (!mongoose.isValidObjectId(attemptId)) {
    throw createControllerError(
      'The attempt ID is invalid.',
      'INVALID_ATTEMPT_ID',
      400,
    );
  }

  const attempt = await QuizAttempt.findOne({
    _id: attemptId,
    student: studentId,
  }).exec();

  if (!attempt) {
    throw createControllerError(
      'The quiz attempt was not found.',
      'QUIZ_ATTEMPT_NOT_FOUND',
      404,
    );
  }

  return attempt;
}

/**
 * Re-check current student access every time an answer is saved
 * or an attempt is submitted.
 */
async function getAuthorizedAttemptContext(attempt) {
  const student = await getActiveStudent(attempt.student);

  const quiz = await Quiz.findById(attempt.quiz)
    .populate({
      path: 'course',
      model: Course,
      select: 'title code semester department batches sections status',
    })
    .exec();

  if (!quiz) {
    throw createControllerError(
      'The quiz associated with this attempt no longer exists.',
      'QUIZ_NOT_FOUND',
      404,
    );
  }

  const course = quiz.course;

  if (!course) {
    throw createControllerError(
      'The course associated with this quiz is unavailable.',
      'COURSE_NOT_AVAILABLE',
      404,
    );
  }

  if (
    !student.department
    || String(student.department) !== String(quiz.department)
    || String(student.department) !== String(course.department)
  ) {
    throw createControllerError(
      'You do not have access to this quiz.',
      'QUIZ_ACCESS_DENIED',
      403,
    );
  }

  if (course.status !== COURSE_STATUSES.ACTIVE) {
    throw createControllerError(
      'This course is no longer active.',
      'COURSE_NOT_ACTIVE',
      403,
    );
  }

  if (!studentMatchesCourseAllocation(student, course)) {
    throw createControllerError(
      'This course is not allocated to your batch or section.',
      'COURSE_ALLOCATION_DENIED',
      403,
    );
  }

  if (!studentMatchesQuizAssignment(student, quiz)) {
    throw createControllerError(
      'This quiz is not assigned to your batch or section.',
      'QUIZ_ASSIGNMENT_DENIED',
      403,
    );
  }

  return { student, quiz };
}

async function requireActiveAttempt(attempt) {
  if (attempt.status !== QUIZ_ATTEMPT_STATUSES.IN_PROGRESS) {
    throw createControllerError(
      'This quiz attempt is no longer active.',
      'QUIZ_ATTEMPT_NOT_ACTIVE',
      409,
    );
  }

  if (new Date() >= attempt.expiresAt) {
    attempt.status = QUIZ_ATTEMPT_STATUSES.EXPIRED;

    await attempt.save();

    throw createControllerError(
      'The quiz attempt has expired.',
      'QUIZ_ATTEMPT_EXPIRED',
      409,
    );
  }
}

function serializeAttempt(attempt) {
  return {
    id: attempt._id.toString(),
    quizId: attempt.quiz.toString(),
    status: attempt.status,
    startedAt: attempt.startedAt,
    expiresAt: attempt.expiresAt,
    submittedAt: attempt.submittedAt,
    totalMarks: attempt.totalMarks,
    score: attempt.score,
    answers: attempt.answers.map((answer) => ({
      questionId: answer.questionId.toString(),
      selectedOptionIndex: answer.selectedOptionIndex,
      answeredAt: answer.answeredAt,
    })),
  };
}

/**
 * PATCH /api/v1/quizzes/attempts/:attemptId/answers
 *
 * Saves or clears one answer belonging to the authenticated
 * student's own quiz attempt.
 */
export async function saveStudentQuizAnswerController(
  req,
  res,
  next,
) {
  try {
    const studentId = getAuthenticatedStudentId(req);

    const { attemptId } = req.params;

    const {
      questionId,
      selectedOptionIndex,
    } = req.body ?? {};

    if (!mongoose.isValidObjectId(questionId)) {
      throw createControllerError(
        'The question ID is invalid.',
        'INVALID_QUESTION_ID',
        400,
      );
    }

    if (
      selectedOptionIndex !== null
      && (
        !Number.isInteger(selectedOptionIndex)
        || selectedOptionIndex < 0
      )
    ) {
      throw createControllerError(
        'The selected option index must be a non-negative integer or null.',
        'INVALID_SELECTED_OPTION',
        400,
      );
    }

    const attempt = await getOwnedAttempt(
      attemptId,
      studentId,
    );

    const { quiz } = await getAuthorizedAttemptContext(attempt);

    await requireActiveAttempt(attempt);

    if (quiz.status !== QUIZ_STATUSES.PUBLISHED) {
      throw createControllerError(
        'This quiz is no longer accepting answers.',
        'QUIZ_NOT_OPEN',
        409,
      );
    }

    const now = new Date();

    if (
      (quiz.startAt && now < new Date(quiz.startAt))
      || (quiz.endAt && now >= new Date(quiz.endAt))
    ) {
      throw createControllerError(
        'The quiz is outside its permitted answering window.',
        'QUIZ_WINDOW_CLOSED',
        409,
      );
    }

    const question = quiz.questions.find(
      (item) => item._id.toString() === questionId,
    );

    if (!question) {
      throw createControllerError(
        'The question does not belong to this quiz.',
        'QUESTION_NOT_IN_QUIZ',
        400,
      );
    }

    if (
      selectedOptionIndex !== null
      && selectedOptionIndex >= question.options.length
    ) {
      throw createControllerError(
        'The selected option does not exist for this question.',
        'INVALID_SELECTED_OPTION',
        400,
      );
    }

    const answer = attempt.answers.find(
      (item) => item.questionId.toString() === questionId,
    );

    if (!answer) {
      throw createControllerError(
        'The question is not part of this attempt.',
        'QUESTION_NOT_IN_ATTEMPT',
        400,
      );
    }

    answer.selectedOptionIndex = selectedOptionIndex;
    answer.answeredAt = selectedOptionIndex === null
      ? null
      : new Date();

    await attempt.save();

    return res.status(200).json({
      success: true,
      data: serializeAttempt(attempt),
      message: 'Answer saved successfully.',
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /api/v1/quizzes/attempts/:attemptId/submit
 *
 * Calculates the score on the server.
 * The client cannot submit or override the correct answers.
 */
export async function submitStudentQuizAttemptController(
  req,
  res,
  next,
) {
  try {
    const studentId = getAuthenticatedStudentId(req);

    const { attemptId } = req.params;

    const attempt = await getOwnedAttempt(
      attemptId,
      studentId,
    );

    // Authorization is checked even for previously submitted attempts.
    const { quiz } = await getAuthorizedAttemptContext(attempt);

    if (attempt.status === QUIZ_ATTEMPT_STATUSES.SUBMITTED) {
      return res.status(200).json({
        success: true,
        data: serializeAttempt(attempt),
        message: 'This quiz attempt has already been submitted.',
      });
    }

    await requireActiveAttempt(attempt);

    if (!Array.isArray(quiz.questions) || quiz.questions.length === 0) {
      throw createControllerError(
        'This quiz does not contain any questions.',
        'QUIZ_HAS_NO_QUESTIONS',
        409,
      );
    }

    const now = new Date();

    // Do not allow a student to submit an attempt before the quiz starts.
    if (quiz.startAt && now < new Date(quiz.startAt)) {
      throw createControllerError(
        'The quiz has not started yet.',
        'QUIZ_NOT_STARTED',
        409,
      );
    }

    let score = 0;

    for (const question of quiz.questions) {
      const answer = attempt.answers.find(
        (item) => (
          item.questionId.toString() === question._id.toString()
        ),
      );

      if (
        answer
        && answer.selectedOptionIndex !== null
        && answer.selectedOptionIndex === question.correctOptionIndex
      ) {
        score += question.marks;
      }
    }

    attempt.score = score;
    attempt.status = QUIZ_ATTEMPT_STATUSES.SUBMITTED;
    attempt.submittedAt = now;

    await attempt.save();

    return res.status(200).json({
      success: true,
      data: serializeAttempt(attempt),
      message: 'Quiz submitted successfully.',
    });
  } catch (error) {
    return next(error);
  }
}