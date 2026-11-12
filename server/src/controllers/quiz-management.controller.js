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

import { Batch } from '../models/batch.model.js';
import { Section } from '../models/section.model.js';

import {
  Quiz,
  QUIZ_STATUSES,
} from '../models/quiz.model.js';

import { QuizAttempt } from '../models/quiz-attempt.model.js';

function createError(statusCode, code, message) {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.code = code;
  error.expose = true;

  return error;
}

function normalizeId(value) {
  if (value === null || value === undefined) {
    return null;
  }

  return String(value._id ?? value);
}

function isValidId(value) {
  return mongoose.isValidObjectId(value);
}

function normalizeIdList(value, fieldName) {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw createError(
      422,
      'INVALID_ASSIGNMENT',
      `${fieldName} must be an array of IDs.`,
    );
  }

  const ids = value.map((item) => String(item));

  if (ids.some((id) => !isValidId(id))) {
    throw createError(
      422,
      'INVALID_ASSIGNMENT',
      `${fieldName} contains an invalid ID.`,
    );
  }

  return [...new Set(ids)];
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
    throw createError(
      422,
      'INVALID_PAGINATION',
      'Page must be positive and limit must be between 1 and 100.',
    );
  }

  return { page, limit };
}

/**
 * Resolve the authenticated account and its department.
 *
 * HOD:
 *   Must own the department assignment.
 *
 * FACULTY:
 *   Must be an active faculty account assigned to the department.
 */
async function getActorContext(userId) {
  if (!isValidId(userId)) {
    throw createError(
      401,
      'INVALID_AUTHENTICATED_USER',
      'The authenticated user is invalid.',
    );
  }

  const actor = await User.findById(userId)
    .select('_id role status department')
    .exec();

  if (!actor) {
    throw createError(
      401,
      'UNAUTHORIZED',
      'The authenticated account could not be found.',
    );
  }

  if (actor.status !== ACCOUNT_STATUSES.ACTIVE) {
    throw createError(
      403,
      'ACCOUNT_INACTIVE',
      'Your account is not active.',
    );
  }

  if (
    actor.role !== USER_ROLES.HOD
    && actor.role !== USER_ROLES.FACULTY
  ) {
    throw createError(
      403,
      'FORBIDDEN',
      'Only HOD and Faculty accounts can manage quizzes.',
    );
  }

  if (!actor.department) {
    throw createError(
      409,
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
    .exec();

  if (!department) {
    throw createError(
      403,
      'DEPARTMENT_ASSIGNMENT_INVALID',
      'Your active department assignment could not be verified.',
    );
  }

  return {
    actor,
    department,
    isHod: actor.role === USER_ROLES.HOD,
    isFaculty: actor.role === USER_ROLES.FACULTY,
  };
}

/**
 * Find a course the current user is permitted to manage.
 *
 * HOD:
 *   Any active course in the HOD's department.
 *
 * Faculty:
 *   Only active courses assigned to that faculty account.
 */
async function getManageableCourse({
  actor,
  departmentId,
  courseId,
}) {
  if (!isValidId(courseId)) {
    throw createError(
      422,
      'INVALID_COURSE',
      'A valid course must be selected.',
    );
  }

  const filter = {
    _id: courseId,
    department: departmentId,
    status: COURSE_STATUSES.ACTIVE,
  };

  if (actor.role === USER_ROLES.FACULTY) {
    filter.faculty = actor._id;
  }

  const course = await Course.findOne(filter)
    .select(
      '_id title code department faculty semester batches sections status',
    )
    .exec();

  if (!course) {
    throw createError(
      403,
      'COURSE_ACCESS_DENIED',
      'The selected course is inactive, unavailable, or not assigned to you.',
    );
  }

  return course;
}

/**
 * Validate the selected course, batch and section combination.
 *
 * A batch/section must:
 * - belong to the department;
 * - be active;
 * - be allocated to the selected course;
 * - have a valid batch-section relationship.
 *
 * Semester comes from the existing Course.semester field.
 */
async function validateAssignments({
  actor,
  departmentId,
  courseId,
  batchIds,
  sectionIds,
}) {
  const course = await getManageableCourse({
    actor,
    departmentId,
    courseId,
  });

  const requestedBatchIds = batchIds ?? [];
  const requestedSectionIds = sectionIds ?? [];

  const courseBatchIds = new Set(
    (course.batches || []).map(normalizeId),
  );

  const courseSectionIds = new Set(
    (course.sections || []).map(normalizeId),
  );

  for (const batchId of requestedBatchIds) {
    if (!courseBatchIds.has(batchId)) {
      throw createError(
        422,
        'BATCH_NOT_ASSIGNED_TO_COURSE',
        'Every selected batch must be assigned to the selected course.',
      );
    }
  }

  for (const sectionId of requestedSectionIds) {
    if (!courseSectionIds.has(sectionId)) {
      throw createError(
        422,
        'SECTION_NOT_ASSIGNED_TO_COURSE',
        'Every selected section must be assigned to the selected course.',
      );
    }
  }

  let batches = [];
  let sections = [];

  if (requestedBatchIds.length > 0) {
    batches = await Batch.find({
      _id: { $in: requestedBatchIds },
      department: departmentId,
      status: 'ACTIVE',
    })
      .select('_id')
      .exec();

    if (batches.length !== requestedBatchIds.length) {
      throw createError(
        422,
        'INVALID_BATCH_ASSIGNMENT',
        'Every selected batch must be active and belong to your department.',
      );
    }
  }

  if (requestedSectionIds.length > 0) {
    sections = await Section.find({
      _id: { $in: requestedSectionIds },
      department: departmentId,
      status: 'ACTIVE',
    })
      .select('_id batch')
      .exec();

    if (sections.length !== requestedSectionIds.length) {
      throw createError(
        422,
        'INVALID_SECTION_ASSIGNMENT',
        'Every selected section must be active and belong to your department.',
      );
    }
  }

  const selectedBatchIds = new Set(requestedBatchIds);

  for (const section of sections) {
    const sectionBatchId = normalizeId(section.batch);

    /*
     * When explicit batches are supplied, every section must
     * belong to one of those batches.
     */
    if (
      selectedBatchIds.size > 0
      && !selectedBatchIds.has(sectionBatchId)
    ) {
      throw createError(
        422,
        'SECTION_BATCH_MISMATCH',
        'Every selected section must belong to a selected batch.',
      );
    }
  }

  return {
    course,
    courseId: course._id,
    semester: course.semester || '',
    batches: requestedBatchIds,
    sections: requestedSectionIds,
  };
}

function validateQuestions(questions) {
  if (!Array.isArray(questions)) {
    throw createError(
      422,
      'INVALID_QUESTIONS',
      'Questions must be an array.',
    );
  }

  if (questions.length === 0) {
    throw createError(
      422,
      'QUESTIONS_REQUIRED',
      'A quiz must contain at least one question.',
    );
  }

  if (questions.length > 200) {
    throw createError(
      422,
      'QUESTION_LIMIT_EXCEEDED',
      'A quiz cannot contain more than 200 questions.',
    );
  }

  return questions.map((question, index) => {
    const text = String(question?.question ?? '').trim();

    const options = Array.isArray(question?.options)
      ? question.options.map((option) => String(option ?? '').trim())
      : [];

    const correctOptionIndex = Number(question?.correctOptionIndex);
    const marks = Number(question?.marks);

    if (!text || text.length > 5000) {
      throw createError(
        422,
        'INVALID_QUESTION_TEXT',
        `Question ${index + 1} must contain between 1 and 5000 characters.`,
      );
    }

    if (
      options.length < 2
      || options.length > 10
      || options.some(
        (option) => !option || option.length > 1000,
      )
    ) {
      throw createError(
        422,
        'INVALID_QUESTION_OPTIONS',
        `Question ${index + 1} must have 2 to 10 non-empty options.`,
      );
    }

    if (
      !Number.isInteger(correctOptionIndex)
      || correctOptionIndex < 0
      || correctOptionIndex >= options.length
    ) {
      throw createError(
        422,
        'INVALID_CORRECT_OPTION',
        `Question ${index + 1} has an invalid correct option.`,
      );
    }

    if (
      !Number.isInteger(marks)
      || marks < 1
      || marks > 1000
    ) {
      throw createError(
        422,
        'INVALID_QUESTION_MARKS',
        `Question ${index + 1} must have between 1 and 1000 marks.`,
      );
    }

    return {
      question: text,
      options,
      correctOptionIndex,
      marks,
    };
  });
}

function normalizeQuizPayload(body, existingQuiz = null) {
  const payload = {};

  for (const [field, minLength, maxLength] of [
    ['title', 2, 200],
    ['description', 0, 10000],
  ]) {
    if (body[field] === undefined) {
      continue;
    }

    if (typeof body[field] !== 'string') {
      throw createError(
        422,
        'INVALID_QUIZ_FIELD',
        `${field} must be a string.`,
      );
    }

    const value = body[field].trim();

    if (
      value.length < minLength
      || value.length > maxLength
    ) {
      throw createError(
        422,
        'INVALID_QUIZ_FIELD',
        `${field} has an invalid length.`,
      );
    }

    payload[field] = value;
  }

  for (const field of ['startAt', 'endAt']) {
    if (body[field] === undefined) {
      continue;
    }

    const date = new Date(body[field]);

    if (Number.isNaN(date.getTime())) {
      throw createError(
        422,
        'INVALID_QUIZ_DATE',
        `${field} must be a valid date.`,
      );
    }

    payload[field] = date;
  }

  if (body.durationMinutes !== undefined) {
    const duration = Number(body.durationMinutes);

    if (
      !Number.isInteger(duration)
      || duration < 1
      || duration > 1440
    ) {
      throw createError(
        422,
        'INVALID_QUIZ_DURATION',
        'Quiz duration must be between 1 and 1440 minutes.',
      );
    }

    payload.durationMinutes = duration;
  }

  if (body.questions !== undefined) {
    payload.questions = validateQuestions(body.questions);
  }

  if (body.status !== undefined) {
    if (!Object.values(QUIZ_STATUSES).includes(body.status)) {
      throw createError(
        422,
        'INVALID_QUIZ_STATUS',
        'The requested quiz status is invalid.',
      );
    }

    payload.status = body.status;
  }

  const effectiveStartAt =
    payload.startAt ?? existingQuiz?.startAt;

  const effectiveEndAt =
    payload.endAt ?? existingQuiz?.endAt;

  if (
    !effectiveStartAt
    || !effectiveEndAt
    || effectiveEndAt <= effectiveStartAt
  ) {
    throw createError(
      422,
      'INVALID_QUIZ_SCHEDULE',
      'Quiz end time must be later than its start time.',
    );
  }

  const effectiveQuestions =
    payload.questions ?? existingQuiz?.questions;

  if (
    !Array.isArray(effectiveQuestions)
    || effectiveQuestions.length === 0
  ) {
    throw createError(
      422,
      'QUESTIONS_REQUIRED',
      'A quiz must contain at least one question.',
    );
  }

  const totalMarks = effectiveQuestions.reduce(
    (total, question) => total + Number(question.marks),
    0,
  );

  if (
    !Number.isInteger(totalMarks)
    || totalMarks < 1
    || totalMarks > 10000
  ) {
    throw createError(
      422,
      'QUIZ_TOTAL_MARKS_EXCEEDED',
      'Quiz total marks must be between 1 and 10000.',
    );
  }

  payload.totalMarks = totalMarks;

  return payload;
}

function normalizeQuiz(quiz) {
  const course = quiz.course;

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
          faculty: normalizeId(course.faculty),
        }
      : normalizeId(quiz.course),

    semester: course?.semester || '',

    department: normalizeId(quiz.department),

    batches: (quiz.batches || []).map((batch) => ({
      id: normalizeId(batch),
      name: batch.name || '',
      code: batch.code || '',
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
    createdBy: normalizeId(quiz.createdBy),
    publishedAt: quiz.publishedAt || null,
    closedAt: quiz.closedAt || null,
    createdAt: quiz.createdAt,
    updatedAt: quiz.updatedAt,
  };
}

function getQuizAccessFilter({
  actor,
  departmentId,
}) {
  const filter = {
    department: departmentId,
  };

  /*
   * Faculty can only access quizzes for courses currently
   * assigned to them. This is checked again for every request.
   */
  if (actor.role === USER_ROLES.FACULTY) {
    filter.course = {
      $in: [],
    };
  }

  return filter;
}

async function findManageableQuiz({
  quizId,
  actor,
  departmentId,
}) {
  if (!isValidId(quizId)) {
    throw createError(
      422,
      'INVALID_QUIZ_ID',
      'The quiz ID is invalid.',
    );
  }

  const filter = getQuizAccessFilter({
    actor,
    departmentId,
  });

  if (actor.role === USER_ROLES.FACULTY) {
    const assignedCourses = await Course.find({
      department: departmentId,
      faculty: actor._id,
      status: COURSE_STATUSES.ACTIVE,
    })
      .select('_id')
      .lean()
      .exec();

    filter.course = {
      $in: assignedCourses.map((course) => course._id),
    };
  }

  const quiz = await Quiz.findOne({
    ...filter,
    _id: quizId,
  }).exec();

  if (!quiz) {
    throw createError(
      404,
      'QUIZ_NOT_FOUND',
      'The quiz was not found or you do not have permission to manage it.',
    );
  }

  return quiz;
}

async function populateQuiz(quizId) {
  return Quiz.findById(quizId)
    .populate({
      path: 'course',
      select: 'title code semester faculty',
    })
    .populate({
      path: 'batches',
      select: 'name code academicYear',
    })
    .populate({
      path: 'sections',
      select: 'name code batch',
    })
    .lean()
    .exec();
}

/**
 * GET /api/v1/quizzes/manage
 *
 * Lists quizzes the current HOD or Faculty can manage.
 *
 * Query:
 * page, limit, search, status, courseId, semester, batchId, sectionId
 */
export async function listDepartmentQuizzesController(
  req,
  res,
  next,
) {
  try {
    const {
      actor,
      department,
    } = await getActorContext(req.user?.id);

    const { page, limit } = normalizePagination(req.query);

    const filter = getQuizAccessFilter({
      actor,
      departmentId: department._id,
    });

    if (actor.role === USER_ROLES.FACULTY) {
      const assignedCourses = await Course.find({
        department: department._id,
        faculty: actor._id,
        status: COURSE_STATUSES.ACTIVE,
      })
        .select('_id')
        .lean()
        .exec();

      filter.course = {
        $in: assignedCourses.map((course) => course._id),
      };
    }

    if (req.query.status) {
      if (
        !Object.values(QUIZ_STATUSES).includes(req.query.status)
      ) {
        throw createError(
          422,
          'INVALID_QUIZ_STATUS',
          'The requested quiz status is invalid.',
        );
      }

      filter.status = req.query.status;
    }

    if (req.query.courseId) {
      if (!isValidId(req.query.courseId)) {
        throw createError(
          422,
          'INVALID_COURSE',
          'The course ID is invalid.',
        );
      }

      filter.course = req.query.courseId;

      if (actor.role === USER_ROLES.FACULTY) {
        const assignedCourse = await Course.findOne({
          _id: req.query.courseId,
          department: department._id,
          faculty: actor._id,
          status: COURSE_STATUSES.ACTIVE,
        })
          .select('_id')
          .lean()
          .exec();

        if (!assignedCourse) {
          throw createError(
            403,
            'COURSE_ACCESS_DENIED',
            'You cannot access quizzes for this course.',
          );
        }
      }
    }

    if (req.query.semester !== undefined) {
      const matchingCourses = await Course.find({
        department: department._id,
        semester: req.query.semester,
        status: COURSE_STATUSES.ACTIVE,
        ...(actor.role === USER_ROLES.FACULTY
          ? { faculty: actor._id }
          : {}),
      })
        .select('_id')
        .lean()
        .exec();

      const matchingCourseIds = matchingCourses.map(
        (course) => course._id,
      );

      if (filter.course?.$in) {
        filter.course.$in = filter.course.$in.filter(
          (id) => matchingCourseIds.some(
            (match) => String(match) === String(id),
          ),
        );
      } else if (filter.course) {
        if (
          !matchingCourseIds.some(
            (id) => String(id) === String(filter.course),
          )
        ) {
          filter._id = { $exists: false };
        }
      } else {
        filter.course = {
          $in: matchingCourseIds,
        };
      }
    }

    for (const [queryKey, field] of [
      ['batchId', 'batches'],
      ['sectionId', 'sections'],
    ]) {
      if (req.query[queryKey] === undefined) {
        continue;
      }

      if (!isValidId(req.query[queryKey])) {
        throw createError(
          422,
          'INVALID_ASSIGNMENT',
          `${queryKey} is invalid.`,
        );
      }

      filter[field] = req.query[queryKey];
    }

    if (req.query.search) {
      const search = String(req.query.search).trim();

      if (search.length > 100) {
        throw createError(
          422,
          'INVALID_SEARCH',
          'Search text cannot exceed 100 characters.',
        );
      }

      const escapedSearch = search.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&',
      );

      filter.title = new RegExp(escapedSearch, 'i');
    }

    const skip = (page - 1) * limit;

    const [quizzes, total] = await Promise.all([
      Quiz.find(filter)
        .populate({
          path: 'course',
          select: 'title code semester faculty',
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
          createdAt: -1,
          _id: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),

      Quiz.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: 'Quizzes retrieved successfully.',
      data: {
        quizzes: quizzes.map(normalizeQuiz),
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
 * POST /api/v1/quizzes/manage
 *
 * HOD creates quizzes for department courses.
 * Faculty creates quizzes only for their assigned courses.
 */
export async function createDepartmentQuizController(
  req,
  res,
  next,
) {
  try {
    const {
      actor,
      department,
    } = await getActorContext(req.user?.id);

    const {
      courseId,
      batchIds = [],
      sectionIds = [],
    } = req.body;

    const normalizedBatchIds = normalizeIdList(
      batchIds,
      'batchIds',
    );

    const normalizedSectionIds = normalizeIdList(
      sectionIds,
      'sectionIds',
    );

    const assignments = await validateAssignments({
      actor,
      departmentId: department._id,
      courseId,
      batchIds: normalizedBatchIds,
      sectionIds: normalizedSectionIds,
    });

    const payload = normalizeQuizPayload(req.body);

    const requestedStatus =
      payload.status ?? QUIZ_STATUSES.DRAFT;

    const quiz = await Quiz.create({
      ...payload,
      status: requestedStatus,
      course: assignments.courseId,
      department: department._id,
      batches: assignments.batches,
      sections: assignments.sections,
      createdBy: actor._id,

      publishedAt:
        requestedStatus === QUIZ_STATUSES.PUBLISHED
          ? new Date()
          : null,

      closedAt:
        requestedStatus === QUIZ_STATUSES.CLOSED
          ? new Date()
          : null,
    });

    const createdQuiz = await populateQuiz(quiz._id);

    return res.status(201).json({
      success: true,
      message: 'Quiz created successfully.',
      data: {
        quiz: normalizeQuiz(createdQuiz),
      },
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * PATCH /api/v1/quizzes/manage/:quizId
 *
 * Updates quiz metadata, schedule, questions and assignments.
 *
 * If attempts exist, questions and academic assignments cannot
 * be changed because doing so could invalidate student records.
 */
export async function updateDepartmentQuizController(
  req,
  res,
  next,
) {
  try {
    const {
      actor,
      department,
    } = await getActorContext(req.user?.id);

    const quiz = await findManageableQuiz({
      quizId: req.params.quizId,
      actor,
      departmentId: department._id,
    });

    const hasAttempts = Boolean(
      await QuizAttempt.exists({
        quiz: quiz._id,
      }),
    );

    const assignmentFields = [
      'courseId',
      'batchIds',
      'sectionIds',
    ];

    const requestedAssignmentChange = assignmentFields.some(
      (field) => req.body[field] !== undefined,
    );

    if (
      hasAttempts
      && (
        req.body.questions !== undefined
        || requestedAssignmentChange
      )
    ) {
      throw createError(
        409,
        'QUIZ_HAS_ATTEMPTS',
        'Questions and learner assignments cannot be changed after student attempts exist.',
      );
    }

    const payload = normalizeQuizPayload(req.body, quiz);

    if (requestedAssignmentChange) {
      const requestedBatchIds = normalizeIdList(
        req.body.batchIds
          ?? (quiz.batches || []).map(normalizeId),
        'batchIds',
      );

      const requestedSectionIds = normalizeIdList(
        req.body.sectionIds
          ?? (quiz.sections || []).map(normalizeId),
        'sectionIds',
      );

      const assignments = await validateAssignments({
        actor,
        departmentId: department._id,
        courseId: req.body.courseId ?? normalizeId(quiz.course),
        batchIds: requestedBatchIds,
        sectionIds: requestedSectionIds,
      });

      quiz.course = assignments.courseId;
      quiz.batches = assignments.batches;
      quiz.sections = assignments.sections;
    }

    const currentStatus = quiz.status;
    const requestedStatus = payload.status ?? currentStatus;

    if (
      requestedStatus === QUIZ_STATUSES.DRAFT
      && currentStatus !== QUIZ_STATUSES.DRAFT
      && hasAttempts
    ) {
      throw createError(
        409,
        'QUIZ_HAS_ATTEMPTS',
        'A quiz with student attempts cannot be returned to draft.',
      );
    }

    if (
      requestedStatus === QUIZ_STATUSES.PUBLISHED
      && currentStatus !== QUIZ_STATUSES.PUBLISHED
    ) {
      quiz.publishedAt = new Date();
      quiz.closedAt = null;
    }

    if (
      requestedStatus === QUIZ_STATUSES.CLOSED
      && currentStatus !== QUIZ_STATUSES.CLOSED
    ) {
      quiz.closedAt = new Date();
    }

    if (
      requestedStatus === QUIZ_STATUSES.DRAFT
      && currentStatus !== QUIZ_STATUSES.DRAFT
    ) {
      quiz.publishedAt = null;
      quiz.closedAt = null;
    }

    for (const [field, value] of Object.entries(payload)) {
      quiz[field] = value;
    }

    await quiz.save();

    const updatedQuiz = await populateQuiz(quiz._id);

    return res.status(200).json({
      success: true,
      message: 'Quiz updated successfully.',
      data: {
        quiz: normalizeQuiz(updatedQuiz),
      },
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * DELETE /api/v1/quizzes/manage/:quizId
 *
 * Quiz deletion is allowed only if no student attempts exist.
 */
export async function deleteDepartmentQuizController(
  req,
  res,
  next,
) {
  try {
    const {
      actor,
      department,
    } = await getActorContext(req.user?.id);

    const quiz = await findManageableQuiz({
      quizId: req.params.quizId,
      actor,
      departmentId: department._id,
    });

    const hasAttempts = Boolean(
      await QuizAttempt.exists({
        quiz: quiz._id,
      }),
    );

    if (hasAttempts) {
      throw createError(
        409,
        'QUIZ_HAS_ATTEMPTS',
        'This quiz has student attempts and cannot be deleted. Close it instead to preserve academic records.',
      );
    }

    await Quiz.deleteOne({
      _id: quiz._id,
      department: department._id,
    }).exec();

    return res.status(200).json({
      success: true,
      message: 'Quiz deleted successfully.',
      data: {
        id: String(quiz._id),
      },
    });
  } catch (error) {
    return next(error);
  }
}