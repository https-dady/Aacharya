import mongoose from 'mongoose';

import {
  Assessment,
  ASSESSMENT_STATUSES,
} from '../models/assessment.model.js';

import {
  AssessmentResult,
  ASSESSMENT_RESULT_STATUSES,
} from '../models/assessment-result.model.js';

import { Batch } from '../models/batch.model.js';
import { Course } from '../models/course.model.js';
import { Department } from '../models/department.model.js';
import { Section } from '../models/section.model.js';

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

function getObjectId(value) {
  if (!mongoose.isValidObjectId(value)) {
    throw createHttpError(400, 'Invalid identifier.');
  }

  return new mongoose.Types.ObjectId(value);
}

function normalizeIdList(values = []) {
  return values.map(getObjectId);
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
    throw createHttpError(400, 'Invalid pagination values.');
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

async function getHodContext(req) {
  const userId = req.user?.id;

  if (!userId || !mongoose.isValidObjectId(userId)) {
    throw createHttpError(401, 'Authentication is required.');
  }

  const hod = await User.findOne({
    _id: userId,
    role: USER_ROLES.HOD,
    status: ACCOUNT_STATUSES.ACTIVE,
  })
    .select('_id department')
    .lean()
    .exec();

  if (!hod?.department) {
    throw createHttpError(
      403,
      'An active HOD department assignment is required.',
    );
  }

  const department = await Department.findOne({
    _id: hod.department,
    hod: hod._id,
    status: 'ACTIVE',
  })
    .select('_id name code')
    .lean()
    .exec();

  if (!department) {
    throw createHttpError(
      403,
      'You are not authorized to manage this department.',
    );
  }

  return { hod, department };
}

function normalizeAssessment(assessment, resultCount = 0) {
  const course = assessment.course || {};
  const creator = assessment.createdBy || {};

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
      batch: section.batch ? String(section.batch) : null,
    })),

    assessmentDate: assessment.assessmentDate,
    totalMarks: assessment.totalMarks,
    passingMarks: assessment.passingMarks,
    resultCount,

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

function normalizeAssessmentResult(result, passingMarks) {
  const student = result.student || {};

  const percentage =
    result.status === ASSESSMENT_RESULT_STATUSES.ENTERED &&
    result.marksObtained !== null
      ? Number(
          (
            (result.marksObtained / result.totalMarks) *
            100
          ).toFixed(2),
        )
      : null;

  return {
    id: String(result._id),

    student: {
      id: student._id ? String(student._id) : null,
      institutionalId: student.institutionalId || '',
      fullName: student.fullName || 'Unknown student',
    },

    marksObtained: result.marksObtained,
    totalMarks: result.totalMarks,
    percentage,

    passed:
      percentage === null
        ? null
        : result.marksObtained >= passingMarks,

    status: result.status,
    remarks: result.remarks || '',

    evaluatedBy: result.evaluatedBy
      ? String(result.evaluatedBy)
      : null,

    evaluatedAt: result.evaluatedAt,
    publishedAt: result.publishedAt,
    createdAt: result.createdAt,
    updatedAt: result.updatedAt,
  };
}

async function getAssessmentForHod(assessmentId, departmentId) {
  const assessment = await Assessment.findOne({
    _id: assessmentId,
    department: departmentId,
  }).exec();

  if (!assessment) {
    throw createHttpError(
      404,
      'Assessment was not found in your department.',
    );
  }

  return assessment;
}

async function validateAssessmentTargets({
  departmentId,
  courseId,
  batchIds,
  sectionIds,
}) {
  const course = await Course.findOne({
    _id: courseId,
    department: departmentId,
    status: 'ACTIVE',
  })
    .select('_id title code semester batches sections')
    .lean()
    .exec();

  if (!course) {
    throw createHttpError(
      404,
      'The selected active course was not found in your department.',
    );
  }

  const batches = batchIds.length
    ? await Batch.find({
        _id: { $in: batchIds },
        department: departmentId,
        status: 'ACTIVE',
      })
        .select('_id name code department')
        .lean()
        .exec()
    : [];

  if (batches.length !== batchIds.length) {
    throw createHttpError(
      400,
      'One or more selected batches are invalid or inactive.',
    );
  }

  const sections = sectionIds.length
    ? await Section.find({
        _id: { $in: sectionIds },
        department: departmentId,
        status: 'ACTIVE',
      })
        .select('_id name code batch department')
        .lean()
        .exec()
    : [];

  if (sections.length !== sectionIds.length) {
    throw createHttpError(
      400,
      'One or more selected sections are invalid or inactive.',
    );
  }

  const courseBatchIds = new Set(
    (course.batches || []).map(String),
  );

  const courseSectionIds = new Set(
    (course.sections || []).map(String),
  );

  for (const batch of batches) {
    if (!courseBatchIds.has(String(batch._id))) {
      throw createHttpError(
        400,
        `Batch ${batch.name} is not assigned to the selected course.`,
      );
    }
  }

  for (const section of sections) {
    if (!courseSectionIds.has(String(section._id))) {
      throw createHttpError(
        400,
        `Section ${section.name} is not assigned to the selected course.`,
      );
    }

    if (
      batchIds.length > 0 &&
      !batchIds.some(
        (batchId) => String(batchId) === String(section.batch),
      )
    ) {
      throw createHttpError(
        400,
        `Section ${section.name} does not belong to a selected batch.`,
      );
    }
  }

  return { course, batches, sections };
}

async function getAssessmentStudentRoster({
  departmentId,
  batches,
  sections,
}) {
  const batchIds = batches.map((batch) => batch._id);
  const sectionIds = sections.map((section) => section._id);

  const assignmentFilter = sectionIds.length
    ? { assignedSections: { $in: sectionIds } }
    : { assignedBatches: { $in: batchIds } };

  const students = await User.find({
    department: departmentId,
    role: USER_ROLES.STUDENT,
    status: ACCOUNT_STATUSES.ACTIVE,
    ...assignmentFilter,
  })
    .select('_id assignedBatches assignedSections')
    .lean()
    .exec();

  const batchById = new Map(
    batches.map((batch) => [String(batch._id), batch]),
  );

  const sectionById = new Map(
    sections.map((section) => [String(section._id), section]),
  );

  return students.map((student) => {
    const selectedSectionId = (student.assignedSections || [])
      .map(String)
      .find((id) => sectionById.has(id));

    const section = selectedSectionId
      ? sectionById.get(selectedSectionId)
      : null;

    const selectedBatchId = (student.assignedBatches || [])
      .map(String)
      .find((id) => batchById.has(id));

    const batch =
      (selectedBatchId && batchById.get(selectedBatchId)) ||
      (section && batchById.get(String(section.batch))) ||
      null;

    return {
      student: student._id,
      batch: batch?._id || null,
      section: section?._id || null,
    };
  });
}

function getResultSummary(results) {
  const summary = {
    total: results.length,
    pending: 0,
    entered: 0,
    absent: 0,
    exempt: 0,
  };

  for (const result of results) {
    switch (result.status) {
      case ASSESSMENT_RESULT_STATUSES.PENDING:
        summary.pending += 1;
        break;

      case ASSESSMENT_RESULT_STATUSES.ENTERED:
        summary.entered += 1;
        break;

      case ASSESSMENT_RESULT_STATUSES.ABSENT:
        summary.absent += 1;
        break;

      case ASSESSMENT_RESULT_STATUSES.EXEMPT:
        summary.exempt += 1;
        break;

      default:
        break;
    }
  }

  return summary;
}

export async function listHodAssessmentsController(req, res, next) {
  try {
    const { department } = await getHodContext(req);
    const query = req.validated.query;
    const { page, limit, skip } = getPagination(query);

    const filter = {
      department: department._id,
    };

    if (query.type) filter.type = query.type;
    if (query.status) filter.status = query.status;
    if (query.courseId) filter.course = query.courseId;
    if (query.batchId) filter.batches = query.batchId;
    if (query.sectionId) filter.sections = query.sectionId;

    if (query.startDate || query.endDate) {
      filter.assessmentDate = {};

      if (query.startDate) {
        filter.assessmentDate.$gte = new Date(query.startDate);
      }

      if (query.endDate) {
        filter.assessmentDate.$lte = new Date(query.endDate);
      }
    }

    if (query.search) {
      const search = new RegExp(
        escapeRegex(query.search.trim()),
        'i',
      );

      filter.$or = [
        { title: search },
        { description: search },
      ];
    }

    const [assessments, total] = await Promise.all([
      Assessment.find(filter)
        .sort({ assessmentDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('course', 'title code semester')
        .populate('batches', 'name code')
        .populate('sections', 'name code batch')
        .populate('createdBy', 'fullName')
        .lean()
        .exec(),

      Assessment.countDocuments(filter),
    ]);

    const resultCounts = await Promise.all(
      assessments.map((assessment) =>
        AssessmentResult.countDocuments({
          assessment: assessment._id,
        }),
      ),
    );

    return res.status(200).json({
      success: true,
      data: {
        department: {
          id: String(department._id),
          name: department.name,
          code: department.code,
        },

        assessments: assessments.map((assessment, index) =>
          normalizeAssessment(assessment, resultCounts[index]),
        ),

        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function createHodAssessmentController(req, res, next) {
  let session;

  try {
    const { hod, department } = await getHodContext(req);
    const body = req.validated.body;

    const batchIds = normalizeIdList(body.batchIds || []);
    const sectionIds = normalizeIdList(body.sectionIds || []);

    if (!batchIds.length && !sectionIds.length) {
      throw createHttpError(
        400,
        'Select at least one batch or section.',
      );
    }

    const { course, batches, sections } =
      await validateAssessmentTargets({
        departmentId: department._id,
        courseId: body.courseId,
        batchIds,
        sectionIds,
      });

    const roster = await getAssessmentStudentRoster({
      departmentId: department._id,
      batches,
      sections,
    });

    if (!roster.length) {
      throw createHttpError(
        409,
        'No active students are assigned to the selected assessment targets.',
      );
    }

    session = await mongoose.startSession();

    let createdAssessment;

    await session.withTransaction(async () => {
      const [assessment] = await Assessment.create(
        [
          {
            title: body.title,
            description: body.description || '',
            type: body.type,

            department: department._id,
            course: course._id,

            batches: batchIds,
            sections: sectionIds,

            assessmentDate: body.assessmentDate,
            totalMarks: body.totalMarks,
            passingMarks: body.passingMarks,

            status:
              body.status || ASSESSMENT_STATUSES.DRAFT,

            createdBy: hod._id,
          },
        ],
        { session },
      );

      createdAssessment = assessment;

      await AssessmentResult.insertMany(
        roster.map((entry) => ({
          assessment: assessment._id,
          student: entry.student,
          department: department._id,
          course: course._id,
          batch: entry.batch,
          section: entry.section,
          totalMarks: body.totalMarks,
          marksObtained: null,
          status: ASSESSMENT_RESULT_STATUSES.PENDING,
        })),
        {
          session,
          ordered: true,
        },
      );
    });

    const populated = await Assessment.findById(createdAssessment._id)
      .populate('course', 'title code semester')
      .populate('batches', 'name code')
      .populate('sections', 'name code batch')
      .populate('createdBy', 'fullName')
      .lean()
      .exec();

    return res.status(201).json({
      success: true,
      message: 'Assessment created successfully.',
      data: {
        assessment: normalizeAssessment(populated, roster.length),
      },
    });
  } catch (error) {
    return next(error);
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}

export async function updateHodAssessmentController(req, res, next) {
  try {
    const { department } = await getHodContext(req);
    const { assessmentId } = req.validated.params;
    const body = req.validated.body;

    const assessment = await getAssessmentForHod(
      assessmentId,
      department._id,
    );

    const immutableScopeFields = [
      'courseId',
      'batchIds',
      'sectionIds',
      'totalMarks',
    ];

    if (
      immutableScopeFields.some(
        (field) => body[field] !== undefined,
      )
    ) {
      throw createHttpError(
        409,
        'Course, target groups, and maximum marks cannot be changed after assessment creation.',
      );
    }

    const updates = {};

    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.type !== undefined) updates.type = body.type;
    if (body.assessmentDate !== undefined) {
      updates.assessmentDate = body.assessmentDate;
    }

    if (body.passingMarks !== undefined) {
      if (body.passingMarks > assessment.totalMarks) {
        throw createHttpError(
          400,
          'Passing marks cannot exceed total marks.',
        );
      }

      updates.passingMarks = body.passingMarks;
    }

    if (body.status !== undefined) {
      if (
        assessment.status === ASSESSMENT_STATUSES.CLOSED
      ) {
        throw createHttpError(
          409,
          'A closed assessment cannot be reopened.',
        );
      }

      if (
        body.status === ASSESSMENT_STATUSES.PUBLISHED &&
        assessment.status !== ASSESSMENT_STATUSES.PUBLISHED
      ) {
        const counts = await AssessmentResult.aggregate([
          {
            $match: {
              assessment: assessment._id,
              department: department._id,
            },
          },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
            },
          },
        ]);

        const summary = Object.fromEntries(
          counts.map((item) => [item._id, item.count]),
        );

        const pending = summary.PENDING || 0;
        const total = counts.reduce(
          (sum, item) => sum + item.count,
          0,
        );

        if (!total || pending > 0) {
          throw createHttpError(
            409,
            'All student results must be entered, absent, or exempt before publishing.',
          );
        }

        updates.publishedAt = new Date();
      }

      if (
        body.status === ASSESSMENT_STATUSES.CLOSED
      ) {
        if (
          assessment.status !== ASSESSMENT_STATUSES.PUBLISHED
        ) {
          throw createHttpError(
            409,
            'Only a published assessment can be closed.',
          );
        }

        updates.closedAt = new Date();
      }

      updates.status = body.status;
    }

    const updated = await Assessment.findOneAndUpdate(
      {
        _id: assessment._id,
        department: department._id,
        status: assessment.status,
      },
      {
        $set: updates,
      },
      {
        new: true,
        runValidators: true,
      },
    )
      .populate('course', 'title code semester')
      .populate('batches', 'name code')
      .populate('sections', 'name code batch')
      .populate('createdBy', 'fullName')
      .lean()
      .exec();

    if (!updated) {
      throw createHttpError(
        409,
        'The assessment changed while this request was being processed.',
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Assessment updated successfully.',
      data: {
        assessment: normalizeAssessment(updated),
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function listHodAssessmentResultsController(req, res, next) {
  try {
    const { department } = await getHodContext(req);
    const { assessmentId } = req.validated.params;
    const query = req.validated.query;

    const { page, limit, skip } = getPagination(query);

    const assessment = await getAssessmentForHod(
      assessmentId,
      department._id,
    );

    const filter = {
      assessment: assessment._id,
      department: department._id,
    };

    if (query.status) {
      filter.status = query.status;
    }

    if (query.search) {
      const search = new RegExp(
        escapeRegex(query.search.trim()),
        'i',
      );

      const matchingStudents = await User.find({
        department: department._id,
        role: USER_ROLES.STUDENT,
        $or: [
          { fullName: search },
          { institutionalId: search },
        ],
      })
        .select('_id')
        .lean()
        .exec();

      filter.student = {
        $in: matchingStudents.map((student) => student._id),
      };
    }

    const [results, total, statusCounts] = await Promise.all([
      AssessmentResult.find(filter)
        .sort({ createdAt: 1, _id: 1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: 'student',
          select: 'institutionalId fullName department role',
        })
        .lean()
        .exec(),

      AssessmentResult.countDocuments(filter),

      AssessmentResult.aggregate([
        {
          $match: {
            assessment: assessment._id,
            department: department._id,
          },
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const counts = Object.fromEntries(
      statusCounts.map((item) => [item._id, item.count]),
    );

    return res.status(200).json({
      success: true,
      data: {
        assessment: {
          id: String(assessment._id),
          title: assessment.title,
          type: assessment.type,
          status: assessment.status,
          totalMarks: assessment.totalMarks,
          passingMarks: assessment.passingMarks,
        },

        summary: {
          total: Object.values(counts).reduce(
            (sum, value) => sum + value,
            0,
          ),
          pending: counts.PENDING || 0,
          entered: counts.ENTERED || 0,
          absent: counts.ABSENT || 0,
          exempt: counts.EXEMPT || 0,
        },

        results: results.map((result) =>
          normalizeAssessmentResult(
            result,
            assessment.passingMarks,
          ),
        ),

        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateHodAssessmentResultsController(req, res, next) {
  try {
    const { hod, department } = await getHodContext(req);
    const { assessmentId } = req.validated.params;
    const { results } = req.validated.body;

    const assessment = await getAssessmentForHod(
      assessmentId,
      department._id,
    );

    if (assessment.status !== ASSESSMENT_STATUSES.DRAFT) {
      throw createHttpError(
        409,
        'Marks can only be edited while the assessment is in draft status.',
      );
    }

    const studentIds = results.map((result) => result.studentId);

    if (new Set(studentIds).size !== studentIds.length) {
      throw createHttpError(
        400,
        'A student can appear only once in a bulk marks request.',
      );
    }

    const resultRecords = await AssessmentResult.find({
      assessment: assessment._id,
      department: department._id,
      student: {
        $in: normalizeIdList(studentIds),
      },
    })
      .select('_id student totalMarks')
      .lean()
      .exec();

    if (resultRecords.length !== studentIds.length) {
      throw createHttpError(
        400,
        'One or more students do not belong to this assessment roster.',
      );
    }

    const recordsByStudent = new Map(
      resultRecords.map((record) => [
        String(record.student),
        record,
      ]),
    );

    const operations = results.map((entry) => {
      const record = recordsByStudent.get(entry.studentId);

      if (!record) {
        throw createHttpError(
          400,
          'A requested student result record was not found.',
        );
      }

      const entered =
        entry.status === ASSESSMENT_RESULT_STATUSES.ENTERED;

      if (entered) {
        if (typeof entry.marksObtained !== 'number') {
          throw createHttpError(
            400,
            'Marks are required for entered results.',
          );
        }

        if (entry.marksObtained > record.totalMarks) {
          throw createHttpError(
            400,
            'Obtained marks cannot exceed the assessment maximum.',
          );
        }
      } else if (
        entry.marksObtained !== undefined &&
        entry.marksObtained !== null
      ) {
        throw createHttpError(
          400,
          'Pending, absent, and exempt results cannot contain marks.',
        );
      }

      const update = {
        status: entry.status,

        marksObtained: entered
          ? entry.marksObtained
          : null,

        evaluatedBy: entered ? hod._id : null,
        evaluatedAt: entered ? new Date() : null,
      };

      if (entry.remarks !== undefined) {
        update.remarks = entry.remarks;
      }

      return {
        updateOne: {
          filter: {
            _id: record._id,
            assessment: assessment._id,
            department: department._id,
          },
          update: {
            $set: update,
          },
        },
      };
    });

    await AssessmentResult.bulkWrite(operations, {
      ordered: true,
    });

    const [updatedResults, allResults] = await Promise.all([
      AssessmentResult.find({
        assessment: assessment._id,
        department: department._id,
        student: {
          $in: normalizeIdList(studentIds),
        },
      })
        .populate('student', 'institutionalId fullName')
        .lean()
        .exec(),

      AssessmentResult.find({
        assessment: assessment._id,
        department: department._id,
      })
        .select('status')
        .lean()
        .exec(),
    ]);

    return res.status(200).json({
      success: true,
      message: 'Student marks updated successfully.',
      data: {
        results: updatedResults.map((result) =>
          normalizeAssessmentResult(
            result,
            assessment.passingMarks,
          ),
        ),

        summary: getResultSummary(allResults),
      },
    });
  } catch (error) {
    return next(error);
  }
}