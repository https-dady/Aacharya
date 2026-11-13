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
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
    .select('_id department fullName institutionalId')
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

function normalizeAssessment(assessment, counts = {}) {
  const course = assessment.course || {};
  const creator = assessment.createdBy || {};

  const totalResults = Object.values(counts).reduce(
    (sum, count) => sum + count,
    0,
  );

  const entered = counts[ASSESSMENT_RESULT_STATUSES.ENTERED] || 0;
  const pending = counts[ASSESSMENT_RESULT_STATUSES.PENDING] || 0;
  const absent = counts[ASSESSMENT_RESULT_STATUSES.ABSENT] || 0;
  const exempt = counts[ASSESSMENT_RESULT_STATUSES.EXEMPT] || 0;

  return {
    id: String(assessment._id),

    title: assessment.title,
    description: assessment.description || '',

    type: assessment.type,
    status: assessment.status,

    department: String(assessment.department),

    course: course._id
      ? {
          id: String(course._id),
          title: course.title,
          code: course.code,
          semester: course.semester || '',
        }
      : null,

    batches: (assessment.batches || []).map((batch) => ({
      id: String(batch._id),
      name: batch.name,
      code: batch.code,
    })),

    sections: (assessment.sections || []).map((section) => ({
      id: String(section._id),
      name: section.name,
      code: section.code,
      batch: section.batch
        ? String(section.batch)
        : null,
    })),

    assessmentDate: assessment.assessmentDate,

    totalMarks: assessment.totalMarks,
    passingMarks: assessment.passingMarks,

    resultSummary: {
      total: totalResults,
      entered,
      pending,
      absent,
      exempt,
      evaluatedPercentage:
        totalResults > 0
          ? Number(((entered / totalResults) * 100).toFixed(2))
          : 0,
    },

    createdBy: creator._id
      ? {
          id: String(creator._id),
          name: creator.fullName,
        }
      : null,

    publishedAt: assessment.publishedAt,
    closedAt: assessment.closedAt,

    createdAt: assessment.createdAt,
    updatedAt: assessment.updatedAt,
  };
}

export async function listFacultyAcademicResultsController(
  req,
  res,
  next,
) {
  try {
    const faculty = await getActiveFaculty(req);

    const query = req.validated.query;

    const {
      page,
      limit,
      skip,
    } = getPagination(query);

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
      return res.status(200).json({
        success: true,
        message: 'No active courses are assigned to this Faculty account.',
        data: {
          items: [],
          summary: {
            totalAssessments: 0,
            publishedAssessments: 0,
            draftAssessments: 0,
            closedAssessments: 0,
            totalStudentResults: 0,
            enteredResults: 0,
            pendingResults: 0,
            absentResults: 0,
            exemptResults: 0,
          },
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

    const filter = {
      department: faculty.department,
      course: {
        $in: courseIds,
      },
    };

    if (query.type) {
      filter.type = query.type;
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (query.courseId) {
      filter.course = query.courseId;
    }

    if (query.startDate || query.endDate) {
      filter.assessmentDate = {};

      if (query.startDate) {
        filter.assessmentDate.$gte = new Date(
          query.startDate,
        );
      }

      if (query.endDate) {
        filter.assessmentDate.$lte = new Date(
          query.endDate,
        );
      }
    }

    if (query.search) {
      const search = new RegExp(
        escapeRegex(query.search.trim()),
        'i',
      );

      filter.$or = [
        {
          title: search,
        },
        {
          description: search,
        },
      ];
    }

    const [
      assessments,
      total,
      assessmentStatusCounts,
      resultStatusCounts,
    ] = await Promise.all([
      Assessment.find(filter)
        .sort({
          assessmentDate: -1,
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit)
        .populate('course', 'title code semester')
        .populate('batches', 'name code')
        .populate('sections', 'name code batch')
        .populate('createdBy', 'fullName')
        .lean()
        .exec(),

      Assessment.countDocuments(filter),

      Assessment.aggregate([
        {
          $match: {
            department: faculty.department,
            course: {
              $in: courseIds,
            },
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

      AssessmentResult.aggregate([
        {
          $match: {
            department: faculty.department,
            course: {
              $in: courseIds,
            },
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

    const assessmentCounts = Object.fromEntries(
      assessmentStatusCounts.map((item) => [
        item._id,
        item.count,
      ]),
    );

    const resultCounts = Object.fromEntries(
      resultStatusCounts.map((item) => [
        item._id,
        item.count,
      ]),
    );

    const assessmentIds = assessments.map(
      (assessment) => assessment._id,
    );

    const perAssessmentCounts = assessmentIds.length
      ? await AssessmentResult.aggregate([
          {
            $match: {
              assessment: {
                $in: assessmentIds,
              },
              department: faculty.department,
            },
          },
          {
            $group: {
              _id: {
                assessment: '$assessment',
                status: '$status',
              },
              count: {
                $sum: 1,
              },
            },
          },
        ])
      : [];

    const countsByAssessment = new Map();

    for (const item of perAssessmentCounts) {
      const assessmentId = String(item._id.assessment);

      if (!countsByAssessment.has(assessmentId)) {
        countsByAssessment.set(assessmentId, {});
      }

      countsByAssessment.get(assessmentId)[
        item._id.status
      ] = item.count;
    }

    const items = assessments.map((assessment) =>
      normalizeAssessment(
        assessment,
        countsByAssessment.get(String(assessment._id)) || {},
      ),
    );

    const totalStudentResults = Object.values(
      resultCounts,
    ).reduce(
      (sum, count) => sum + count,
      0,
    );

    return res.status(200).json({
      success: true,
      message: 'Faculty academic results retrieved successfully.',
      data: {
        items,

        summary: {
          totalAssessments:
            Object.values(assessmentCounts).reduce(
              (sum, count) => sum + count,
              0,
            ),

          publishedAssessments:
            assessmentCounts.PUBLISHED || 0,

          draftAssessments:
            assessmentCounts.DRAFT || 0,

          closedAssessments:
            assessmentCounts.CLOSED || 0,

          totalStudentResults,

          enteredResults:
            resultCounts[ASSESSMENT_RESULT_STATUSES.ENTERED] || 0,

          pendingResults:
            resultCounts[ASSESSMENT_RESULT_STATUSES.PENDING] || 0,

          absentResults:
            resultCounts[ASSESSMENT_RESULT_STATUSES.ABSENT] || 0,

          exemptResults:
            resultCounts[ASSESSMENT_RESULT_STATUSES.EXEMPT] || 0,
        },

        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasPreviousPage: page > 1,
          hasNextPage: page < Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    return next(error);
  }
}