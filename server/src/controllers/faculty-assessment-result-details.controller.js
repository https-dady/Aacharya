import mongoose from 'mongoose';

import {
  Assessment,
} from '../models/assessment.model.js';

import {
  AssessmentResult,
  ASSESSMENT_RESULT_STATUSES,
} from '../models/assessment-result.model.js';

import {
  Course,
  COURSE_STATUSES,
} from '../models/course.model.js';

import {
  User,
  USER_ROLES,
  ACCOUNT_STATUSES,
} from '../models/user.model.js';


function createHttpError(statusCode, message, code) {
  const error = new Error(message);

  error.statusCode = statusCode;

  if (code) {
    error.code = code;
  }

  return error;
}


function getPagination(query = {}) {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 20);

  if (
    !Number.isInteger(page) ||
    page < 1 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100
  ) {
    throw createHttpError(
      400,
      'Invalid pagination values.',
    );
  }

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}


function escapeRegex(value) {
  return String(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&',
  );
}


async function getActiveFaculty(req) {
  const userId = req.user?.id;

  if (
    !userId ||
    !mongoose.isValidObjectId(userId)
  ) {
    throw createHttpError(
      401,
      'Authentication is required.',
    );
  }

  const faculty = await User.findOne({
    _id: userId,
    role: USER_ROLES.FACULTY,
    status: ACCOUNT_STATUSES.ACTIVE,
  })
    .select('_id department')
    .lean()
    .exec();

  if (!faculty) {
    throw createHttpError(
      403,
      'An active Faculty account is required.',
    );
  }

  if (!faculty.department) {
    throw createHttpError(
      403,
      'Your Faculty account is not assigned to a department.',
    );
  }

  return faculty;
}


function normalizeAssessment(assessment) {
  return {
    id: String(assessment._id),

    title: assessment.title,

    description: assessment.description || '',

    type: assessment.type,

    status: assessment.status,

    assessmentDate: assessment.assessmentDate,

    totalMarks: assessment.totalMarks,

    passingMarks: assessment.passingMarks,

    course: assessment.course
      ? {
          id: String(assessment.course._id),
          title: assessment.course.title,
          code: assessment.course.code,
        }
      : null,

    publishedAt: assessment.publishedAt ?? null,

    closedAt: assessment.closedAt ?? null,
  };
}


function normalizeStudentResult(result, assessment) {
  const student = result.student;
  const evaluator = result.evaluatedBy;

  const marksObtained =
    result.marksObtained === null ||
    result.marksObtained === undefined
      ? null
      : Number(result.marksObtained);

  const totalMarks = Number(result.totalMarks);

  const isEntered =
    result.status === ASSESSMENT_RESULT_STATUSES.ENTERED;

  const percentage =
    isEntered && totalMarks > 0
      ? Number(
          ((marksObtained / totalMarks) * 100).toFixed(2),
        )
      : null;

  const passed = isEntered
    ? marksObtained >= assessment.passingMarks
    : null;

  return {
    id: String(result._id),

    student: student
      ? {
          id: String(student._id),
          fullName: student.fullName,
          institutionalId: student.institutionalId,
        }
      : null,

    marksObtained,

    totalMarks,

    percentage,

    passed,

    status: result.status,

    remarks: result.remarks || '',

    evaluatedBy: evaluator
      ? {
          id: String(evaluator._id),
          fullName: evaluator.fullName,
          institutionalId: evaluator.institutionalId,
        }
      : null,

    evaluatedAt: result.evaluatedAt ?? null,

    publishedAt: result.publishedAt ?? null,

    createdAt: result.createdAt,

    updatedAt: result.updatedAt,
  };
}


function normalizeSummary(counts = [], total = 0) {
  const statusCounts = Object.fromEntries(
    counts.map((item) => [
      item._id,
      item.count,
    ]),
  );

  return {
    total,

    pending:
      statusCounts[ASSESSMENT_RESULT_STATUSES.PENDING] || 0,

    entered:
      statusCounts[ASSESSMENT_RESULT_STATUSES.ENTERED] || 0,

    absent:
      statusCounts[ASSESSMENT_RESULT_STATUSES.ABSENT] || 0,

    exempt:
      statusCounts[ASSESSMENT_RESULT_STATUSES.EXEMPT] || 0,
  };
}


/**
 * Retrieves paginated student-wise academic results
 * for an assessment accessible to the authenticated Faculty.
 *
 * GET /api/v1/assessments/faculty/:assessmentId/results
 */
export async function listFacultyAssessmentResultDetailsController(
  req,
  res,
  next,
) {
  try {
    const faculty = await getActiveFaculty(req);

    const assessmentId = req.validated.params.assessmentId;

    if (!mongoose.isValidObjectId(assessmentId)) {
      throw createHttpError(
        400,
        'A valid assessment identifier is required.',
      );
    }

    const query = req.validated.query;

    const {
      page,
      limit,
      skip,
    } = getPagination(query);

    // Verify that the requested course is actively assigned
    // to this Faculty member.
    const assignedCourses = await Course.find({
      faculty: faculty._id,
      department: faculty.department,
      status: COURSE_STATUSES.ACTIVE,
    })
      .select('_id')
      .lean()
      .exec();

    const courseIds = assignedCourses.map(
      (course) => course._id,
    );

    if (courseIds.length === 0) {
      throw createHttpError(
        403,
        'No active courses are assigned to your Faculty account.',
      );
    }

    // Verify assessment ownership through department and
    // assigned course. Never trust a client-provided course ID.
    const assessment = await Assessment.findOne({
      _id: assessmentId,
      department: faculty.department,
      course: {
        $in: courseIds,
      },
    })
      .populate('course', 'title code semester')
      .lean()
      .exec();

    if (!assessment) {
      throw createHttpError(
        404,
        'Assessment not found or you do not have access to it.',
      );
    }

    // Search students using the actual User model fields.
    let matchingStudentIds = null;

    if (query.search) {
      const search = new RegExp(
        escapeRegex(query.search.trim()),
        'i',
      );

      const matchingStudents = await User.find({
        department: faculty.department,
        role: USER_ROLES.STUDENT,
        $or: [
          {
            fullName: search,
          },
          {
            institutionalId: search,
          },
        ],
      })
        .select('_id')
        .lean()
        .exec();

      matchingStudentIds = matchingStudents.map(
        (student) => student._id,
      );

      if (matchingStudentIds.length === 0) {
        return res.status(200).json({
          success: true,

          message: 'No student results matched your search.',

          data: {
            assessment: normalizeAssessment(assessment),

            summary: {
              total: 0,
              pending: 0,
              entered: 0,
              absent: 0,
              exempt: 0,
            },

            results: [],

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
    }

    // Every result query is scoped to the verified assessment,
    // department and course.
    const resultFilter = {
      assessment: assessment._id,
      department: faculty.department,
      course: assessment.course._id,
    };

    if (query.status) {
      resultFilter.status = query.status;
    }

    if (matchingStudentIds) {
      resultFilter.student = {
        $in: matchingStudentIds,
      };
    }

    const [
      results,
      total,
      allResultCounts,
    ] = await Promise.all([
      AssessmentResult.find(resultFilter)
        .sort({
          createdAt: 1,
          _id: 1,
        })
        .skip(skip)
        .limit(limit)
        .populate(
          'student',
          'fullName institutionalId',
        )
        .populate(
          'evaluatedBy',
          'fullName institutionalId',
        )
        .lean()
        .exec(),

      AssessmentResult.countDocuments(resultFilter),

      // Overall assessment summary, independent of
      // the currently selected result-status filter.
      AssessmentResult.aggregate([
        {
          $match: {
            assessment: assessment._id,
            department: faculty.department,
            course: assessment.course._id,
          },
        },
        {
          $group: {
            _id: '$status',
            count: {
              $sum: 1,
            },
          },
        },
      ]),
    ]);

    const summaryTotal = allResultCounts.reduce(
      (sum, item) => sum + item.count,
      0,
    );

    const normalizedResults = results.map(
      (result) =>
        normalizeStudentResult(result, assessment),
    );

    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,

      message: 'Faculty student assessment results retrieved successfully.',

      data: {
        assessment: normalizeAssessment(assessment),

        summary: normalizeSummary(
          allResultCounts,
          summaryTotal,
        ),

        results: normalizedResults,

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