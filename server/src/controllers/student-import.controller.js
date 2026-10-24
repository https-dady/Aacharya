import mongoose from 'mongoose';

import {
  User,
  USER_ROLES,
  ACCOUNT_STATUSES,
} from '../models/user.model.js';

import {
  Batch,
} from '../models/batch.model.js';

import {
  Section,
} from '../models/section.model.js';

import {
  hashPassword,
} from '../services/auth/password.service.js';

import {
  parseStudentCsv,
  StudentImportError,
} from '../services/provisioning/student-import.service.js';

import {
  readStudentXlsx,
} from '../services/provisioning/student-xlsx-reader.service.js';

const MAX_IMPORT_SIZE = 1024 * 1024;
const MAX_STUDENTS_PER_IMPORT = 500;

function sendImportError(res, error) {
  return res.status(400).json({
    success: false,
    message: error.message,
    errors: error.details || [],
  });
}

function normalizeIdentifier(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

/**
 * Hash passwords before opening the transaction.
 *
 * This prevents expensive password hashing from being repeated
 * when MongoDB retries a transaction callback.
 *
 * Concurrency is limited to avoid launching 500 hashing operations
 * simultaneously.
 */
async function hashPasswordsWithLimit(rows, concurrency = 8) {
  const hashes = new Array(rows.length);

  let nextIndex = 0;

  async function worker() {
    while (nextIndex < rows.length) {
      const index = nextIndex;

      nextIndex += 1;

      hashes[index] = await hashPassword(
        rows[index].password,
      );
    }
  }

  await Promise.all(
    Array.from(
      {
        length: Math.min(concurrency, rows.length),
      },
      () => worker(),
    ),
  );

  return hashes;
}

export async function importStudentsController(
  req,
  res,
  next,
) {
  let session;

  try {
    const mentor = await User.findById(req.user?.id);

    if (
      !mentor ||
      mentor.status !== ACCOUNT_STATUSES.ACTIVE ||
      mentor.role !== USER_ROLES.MENTOR
    ) {
      return res.status(403).json({
        success: false,
        message:
          'Only active mentors can import students.',
      });
    }

    const { sectionId } = req.params;

    if (!mongoose.isValidObjectId(sectionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid section ID.',
      });
    }

    const hasCsvContent =
      typeof req.body?.csvContent === 'string' &&
      req.body.csvContent.length > 0;

    const hasXlsxFile = Boolean(req.file?.buffer);

    if (hasCsvContent === hasXlsxFile) {
      return res.status(400).json({
        success: false,
        message:
          'Provide either CSV content or one XLSX file, not both.',
      });
    }

    let rows;

    try {
      if (hasXlsxFile) {
        if (req.file.buffer.length > MAX_IMPORT_SIZE) {
          return res.status(400).json({
            success: false,
            message:
              'The XLSX file must not exceed 1 MB.',
          });
        }

        rows = await readStudentXlsx(
          req.file.buffer,
        );
      } else {
        const csvSize = Buffer.byteLength(
          req.body.csvContent,
          'utf8',
        );

        if (csvSize > MAX_IMPORT_SIZE) {
          return res.status(400).json({
            success: false,
            message:
              'CSV content must not exceed 1 MB.',
          });
        }

        rows = parseStudentCsv(
          req.body.csvContent,
        );
      }
    } catch (error) {
      if (error instanceof StudentImportError) {
        return sendImportError(res, error);
      }

      throw error;
    }

    if (!rows.length) {
      return res.status(400).json({
        success: false,
        message:
          'The import file contains no student records.',
      });
    }

    if (rows.length > MAX_STUDENTS_PER_IMPORT) {
      return res.status(400).json({
        success: false,
        message:
          `A maximum of ${MAX_STUDENTS_PER_IMPORT} students can be imported at once.`,
      });
    }

    const institutionalIds = rows.map((row) =>
      String(row.institutionalId)
        .trim()
        .toUpperCase(),
    );

    const normalizedIds = institutionalIds.map(
      normalizeIdentifier,
    );

    if (
      new Set(normalizedIds).size !==
      normalizedIds.length
    ) {
      return res.status(400).json({
        success: false,
        message:
          'The import file contains duplicate institutional IDs.',
      });
    }

    const emailAddresses = rows
      .filter((row) => row.email)
      .map((row) =>
        row.email.trim().toLowerCase(),
      );

    if (
      new Set(emailAddresses).size !==
      emailAddresses.length
    ) {
      return res.status(400).json({
        success: false,
        message:
          'The import file contains duplicate email addresses.',
      });
    }

    const assignedSectionIds = (
      mentor.assignedSections || []
    ).map((id) => id.toString());

    if (!assignedSectionIds.includes(sectionId)) {
      return res.status(403).json({
        success: false,
        message:
          'You are not assigned to this section.',
      });
    }

    /*
     * Password hashing happens before the transaction.
     * This reduces transaction duration and avoids re-hashing
     * when MongoDB retries the transaction callback.
     */
    const passwordHashes =
      await hashPasswordsWithLimit(rows);

    session = await mongoose.startSession();

    let result;

    await session.withTransaction(async () => {
      /*
       * Recheck the mentor's account inside the transaction.
       */
      const activeMentor = await User.findOne({
        _id: mentor._id,
        status: ACCOUNT_STATUSES.ACTIVE,
        role: USER_ROLES.MENTOR,
      }).session(session);

      if (!activeMentor) {
        const error = new Error(
          'Mentor account is no longer active.',
        );

        error.statusCode = 403;

        throw error;
      }

      /*
       * Only an active section can receive student accounts.
       */
      const section = await Section.findOne({
        _id: sectionId,
        status: 'ACTIVE',
      }).session(session);

      if (!section) {
        const error = new Error(
          'Active section not found.',
        );

        error.statusCode = 404;

        throw error;
      }

      const currentAssignedSections = (
        activeMentor.assignedSections || []
      ).map((id) => id.toString());

      if (
        !currentAssignedSections.includes(
          section._id.toString(),
        )
      ) {
        const error = new Error(
          'You are not assigned to this section.',
        );

        error.statusCode = 403;

        throw error;
      }

      /*
       * Confirm the section belongs to an active batch
       * within the same department.
       */
      const batch = await Batch.findOne({
        _id: section.batch,
        department: section.department,
        status: 'ACTIVE',
      }).session(session);

      if (!batch) {
        const error = new Error(
          'The section does not belong to an active batch.',
        );

        error.statusCode = 400;

        throw error;
      }

      const currentAssignedBatches = (
        activeMentor.assignedBatches || []
      ).map((id) => id.toString());

      if (
        !currentAssignedBatches.includes(
          batch._id.toString(),
        )
      ) {
        const error = new Error(
          'You are not assigned to this batch.',
        );

        error.statusCode = 403;

        throw error;
      }

      /*
       * Check existing institutional IDs.
       */
      const existingStudents = await User.find({
        institutionalId: {
          $in: institutionalIds,
        },
      })
        .select('institutionalId')
        .session(session);

      if (existingStudents.length > 0) {
        const error = new Error(
          'Some institutional IDs already exist.',
        );

        error.statusCode = 409;

        error.conflicts = existingStudents.map(
          (student) => student.institutionalId,
        );

        throw error;
      }

      /*
       * Email is optional, but provided email addresses
       * must be unique.
       */
      if (emailAddresses.length > 0) {
        const existingEmails = await User.find({
          email: {
            $in: emailAddresses,
          },
        })
          .select('email')
          .session(session);

        if (existingEmails.length > 0) {
          const error = new Error(
            'Some email addresses already exist.',
          );

          error.statusCode = 409;

          error.conflicts = existingEmails.map(
            (user) => user.email,
          );

          throw error;
        }
      }

      /*
       * Prepare all student documents.
       * Password hashes are already available.
       */
      const students = rows.map((row, index) => ({
        institutionalId: institutionalIds[index],

        fullName: row.fullName.trim(),

        email:
          row.email?.trim().toLowerCase() ||
          undefined,

        passwordHash: passwordHashes[index],

        role: USER_ROLES.STUDENT,

        status: ACCOUNT_STATUSES.ACTIVE,

        department: section.department,

        assignedBatches: [
          batch._id,
        ],

        assignedSections: [
          section._id,
        ],

        createdBy: activeMentor._id,

        isEmailVerified: false,
      }));

      /*
       * Insert all records in one database operation.
       * If insertion fails, the transaction is aborted.
       */
      const createdStudents = await User.insertMany(
        students,
        {
          ordered: true,
          session,
        },
      );

      result = {
        sectionId: section._id,
        batchId: batch._id,
        importedCount: createdStudents.length,

        students: createdStudents.map(
          (student) => ({
            id: student._id,
            institutionalId:
              student.institutionalId,
            fullName: student.fullName,
            email: student.email,
          }),
        ),
      };
    });

    return res.status(201).json({
      success: true,
      message: 'Students imported successfully.',
      data: result,
    });
  } catch (error) {
    if (error instanceof StudentImportError) {
      return sendImportError(res, error);
    }

    if (
      error instanceof mongoose.Error.ValidationError
    ) {
      return res.status(400).json({
        success: false,
        message:
          'One or more student records failed database validation.',

        errors: Object.entries(
          error.errors || {},
        ).map(([field, detail]) => ({
          field,
          message: detail.message,
        })),
      });
    }

    if (error?.code === 11000) {
      const duplicateFields = Object.keys(
        error.keyPattern || {},
      );

      const message =
        duplicateFields.includes('institutionalId')
          ? 'An institutional ID already exists. Refresh the student data and retry.'
          : duplicateFields.includes('email')
            ? 'An email address already exists. Refresh the student data and retry.'
            : 'A duplicate student record was detected.';

      return res.status(409).json({
        success: false,
        message,
        code: 'DUPLICATE_STUDENT_RECORD',
      });
    }

    if (
      [400, 403, 404, 409].includes(
        error.statusCode,
      )
    ) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,

        ...(error.conflicts
          ? {
              conflicts: error.conflicts,
            }
          : {}),
      });
    }

    return next(error);
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}