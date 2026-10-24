import mongoose from 'mongoose';

import {
  User,
  USER_ROLES,
  ACCOUNT_STATUSES,
} from '../models/user.model.js';

import { Batch } from '../models/batch.model.js';
import { Section } from '../models/section.model.js';

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

import {
  StudentImportBatch,
} from '../models/student-import-batch.model.js';

import {
  createStudentImportPayloadHash,
  StudentImportIdempotencyError,
} from '../services/provisioning/student-import-idempotency.service.js';

const MAX_IMPORT_SIZE = 1024 * 1024;
const MAX_STUDENTS_PER_IMPORT = 500;

const IDEMPOTENCY_INDEX_NAME =
  'uniq_mentor_section_import_idempotency';

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

function isIdempotencyDuplicateKeyError(error) {
  if (error?.code !== 11000) {
    return false;
  }

  const keyPattern = error.keyPattern || {};
  const duplicateFields = Object.keys(keyPattern);

  if (
    duplicateFields.length === 3
    && duplicateFields.includes('mentor')
    && duplicateFields.includes('section')
    && duplicateFields.includes('idempotencyKey')
  ) {
    return true;
  }

  return String(error.message || '').includes(
    IDEMPOTENCY_INDEX_NAME,
  );
}

function isRetryableTransactionError(error) {
  if (typeof error?.hasErrorLabel === 'function') {
    return (
      error.hasErrorLabel('TransientTransactionError')
      || error.hasErrorLabel('UnknownTransactionCommitResult')
    );
  }

  return false;
}

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

async function buildImportResponse(importBatch) {
  const students = await User.find({
    _id: { $in: importBatch.studentIds },
  })
    .select('institutionalId fullName email')
    .lean();

  const studentsById = new Map(
    students.map((student) => [
      String(student._id),
      student,
    ]),
  );

  return {
    sectionId: importBatch.section,
    batchId: importBatch.batch,
    importedCount: importBatch.importedCount,
    students: importBatch.studentIds
      .map((id) => studentsById.get(String(id)))
      .filter(Boolean)
      .map((student) => ({
        id: student._id,
        institutionalId: student.institutionalId,
        fullName: student.fullName,
        email: student.email,
      })),
  };
}

async function replayPreviousImport(
  res,
  importBatch,
  payloadHash,
) {
  if (importBatch.payloadHash !== payloadHash) {
    return res.status(409).json({
      success: false,
      message:
        'This Idempotency-Key was already used with different import data. Use a new key for a new import.',
      code: 'IDEMPOTENCY_KEY_PAYLOAD_MISMATCH',
    });
  }

  const data = await buildImportResponse(importBatch);

  return res.status(200).json({
    success: true,
    replayed: true,
    message: 'This import was already completed.',
    data,
  });
}

async function recoverConcurrentImport(
  res,
  idempotencyContext,
) {
  const racedImport = await StudentImportBatch.findOne({
    mentor: idempotencyContext.mentorId,
    section: idempotencyContext.sectionId,
    idempotencyKey: idempotencyContext.idempotencyKey,
  }).lean();

  if (!racedImport) {
    return null;
  }

  return replayPreviousImport(
    res,
    racedImport,
    idempotencyContext.payloadHash,
  );
}

function sendRetryableImportResponse(res) {
  res.set('Retry-After', '2');

  return res.status(503).json({
    success: false,
    message:
      'A temporary database transaction conflict prevented the import from completing. Retry the same request using the same Idempotency-Key.',
    code: 'STUDENT_IMPORT_RETRY_REQUIRED',
    retryable: true,
  });
}

export async function importStudentsController(req, res, next) {
  let session;
  let idempotencyContext;

  try {
    const idempotencyKey = req.idempotencyKey;

    if (
      typeof idempotencyKey !== 'string'
      || idempotencyKey.length < 16
      || idempotencyKey.length > 128
    ) {
      throw new StudentImportIdempotencyError(
        'A valid Idempotency-Key is required.',
      );
    }

    const mentor = await User.findById(req.user?.id);

    if (
      !mentor
      || mentor.status !== ACCOUNT_STATUSES.ACTIVE
      || mentor.role !== USER_ROLES.MENTOR
    ) {
      return res.status(403).json({
        success: false,
        message: 'Only active mentors can import students.',
      });
    }

    if (!mentor.department) {
      return res.status(403).json({
        success: false,
        message: 'The mentor is not assigned to a department.',
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
      typeof req.body?.csvContent === 'string'
      && req.body.csvContent.length > 0;

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
          return res.status(413).json({
            success: false,
            message: 'The XLSX file must not exceed 1 MB.',
          });
        }

        rows = await readStudentXlsx(req.file.buffer);
      } else {
        const csvSize = Buffer.byteLength(
          req.body.csvContent,
          'utf8',
        );

        if (csvSize > MAX_IMPORT_SIZE) {
          return res.status(413).json({
            success: false,
            message: 'CSV content must not exceed 1 MB.',
          });
        }

        rows = parseStudentCsv(req.body.csvContent);
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
        message: 'The import file contains no student records.',
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
      String(row.institutionalId).trim().toUpperCase(),
    );

    const normalizedIds = institutionalIds.map(
      normalizeIdentifier,
    );

    if (new Set(normalizedIds).size !== normalizedIds.length) {
      return res.status(400).json({
        success: false,
        message:
          'The import file contains duplicate institutional IDs.',
      });
    }

    const emailAddresses = rows
      .filter((row) => row.email)
      .map((row) => row.email.trim().toLowerCase());

    if (
      new Set(emailAddresses).size !== emailAddresses.length
    ) {
      return res.status(400).json({
        success: false,
        message:
          'The import file contains duplicate email addresses.',
      });
    }

    const payloadHash = createStudentImportPayloadHash(rows);

    idempotencyContext = {
      mentorId: mentor._id,
      sectionId: new mongoose.Types.ObjectId(sectionId),
      idempotencyKey,
      payloadHash,
    };

    const assignedSectionIds = (
      mentor.assignedSections || []
    ).map((id) => id.toString());

    if (!assignedSectionIds.includes(sectionId)) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this section.',
      });
    }

    /*
     * Fast path: return a previously completed import.
     *
     * The unique database index remains the final protection
     * against concurrent requests racing past this lookup.
     */
    const previousImport = await StudentImportBatch.findOne({
      mentor: mentor._id,
      section: sectionId,
      idempotencyKey,
    }).lean();

    if (previousImport) {
      return replayPreviousImport(
        res,
        previousImport,
        payloadHash,
      );
    }

    /*
     * Hash passwords before opening the transaction.
     * MongoDB can retry transaction callbacks; password hashing
     * should not need to be repeated for every callback attempt.
     */
    const passwordHashes = await hashPasswordsWithLimit(rows);

    session = await mongoose.startSession();

    let result;

    await session.withTransaction(async () => {
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

      if (
        !activeMentor.department
        || !mentor.department
        || activeMentor.department.toString()
          !== mentor.department.toString()
      ) {
        const error = new Error(
          'Mentor department assignment is invalid or has changed.',
        );

        error.statusCode = 403;
        throw error;
      }

      const currentAssignedSections = (
        activeMentor.assignedSections || []
      ).map((id) => id.toString());

      if (!currentAssignedSections.includes(sectionId)) {
        const error = new Error(
          'You are not assigned to this section.',
        );

        error.statusCode = 403;
        throw error;
      }

      const section = await Section.findOne({
        _id: sectionId,
        department: activeMentor.department,
        status: 'ACTIVE',
      }).session(session);

      if (!section) {
        const error = new Error(
          'No active section was found in your department.',
        );

        error.statusCode = 404;
        throw error;
      }

      const batch = await Batch.findOne({
        _id: section.batch,
        department: activeMentor.department,
        status: 'ACTIVE',
      }).session(session);

      if (!batch) {
        const error = new Error(
          'The section does not belong to an active batch in your department.',
        );

        error.statusCode = 400;
        throw error;
      }

      const currentAssignedBatches = (
        activeMentor.assignedBatches || []
      ).map((id) => id.toString());

      if (!currentAssignedBatches.includes(String(batch._id))) {
        const error = new Error(
          'You are not assigned to this batch.',
        );

        error.statusCode = 403;
        throw error;
      }

      const existingStudents = await User.find({
        institutionalId: { $in: institutionalIds },
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

      if (emailAddresses.length > 0) {
        const existingEmails = await User.find({
          email: { $in: emailAddresses },
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

      const students = rows.map((row, index) => ({
        institutionalId: institutionalIds[index],
        fullName: row.fullName.trim(),
        email: row.email?.trim().toLowerCase() || undefined,
        passwordHash: passwordHashes[index],
        role: USER_ROLES.STUDENT,
        status: ACCOUNT_STATUSES.ACTIVE,
        department: section.department,
        assignedBatches: [batch._id],
        assignedSections: [section._id],
        createdBy: activeMentor._id,
        isEmailVerified: false,
      }));

      const createdStudents = await User.insertMany(students, {
        ordered: true,
        session,
      });

      const batchRecord = {
        mentor: activeMentor._id,
        department: activeMentor.department,
        batch: batch._id,
        section: section._id,
        idempotencyKey,
        payloadHash,
        status: 'COMPLETED',
        importedCount: createdStudents.length,
        studentIds: createdStudents.map(
          (student) => student._id,
        ),
        completedAt: new Date(),
      };

      /*
       * Student records and the completed import record are
       * committed together. A failed transaction must not leave
       * a partially completed import.
       */
      await StudentImportBatch.create(
        [batchRecord],
        { session },
      );

      result = {
        sectionId: section._id,
        batchId: batch._id,
        importedCount: createdStudents.length,
        students: createdStudents.map((student) => ({
          id: student._id,
          institutionalId: student.institutionalId,
          fullName: student.fullName,
          email: student.email,
        })),
      };
    });

    return res.status(201).json({
      success: true,
      replayed: false,
      message: 'Students imported successfully.',
      data: result,
    });
  } catch (error) {
    if (error instanceof StudentImportIdempotencyError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        code: error.code,
      });
    }

    if (error instanceof StudentImportError) {
      return sendImportError(res, error);
    }

    /*
     * Recover only when the duplicate-key error corresponds to
     * the idempotency index. Student ID/email uniqueness errors
     * must remain student-conflict responses.
     */
    if (
      isIdempotencyDuplicateKeyError(error)
      && idempotencyContext
    ) {
      try {
        const recoveryResponse = await recoverConcurrentImport(
          res,
          idempotencyContext,
        );

        if (recoveryResponse) {
          return recoveryResponse;
        }
      } catch (recoveryError) {
        return next(recoveryError);
      }

      /*
       * The unique idempotency index rejected the competing write,
       * but the winning record is not yet visible to this lookup.
       * Do not report this as a duplicate student.
       */
      res.set('Retry-After', '2');

      return res.status(503).json({
        success: false,
        message:
          'A concurrent import is being finalized. Retry the same request using the same Idempotency-Key.',
        code: 'STUDENT_IMPORT_RETRY_REQUIRED',
        retryable: true,
      });
    }

    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({
        success: false,
        message:
          'One or more student records failed database validation.',
        errors: Object.entries(error.errors || {}).map(
          ([field, detail]) => ({
            field,
            message: detail.message,
          }),
        ),
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

    if (isRetryableTransactionError(error)) {
      return sendRetryableImportResponse(res);
    }

    if ([400, 403, 404, 409].includes(error.statusCode)) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        ...(error.conflicts
          ? { conflicts: error.conflicts }
          : {}),
      });
    }

    return next(error);
  } finally {
    if (session) {
      try {
        await session.endSession();
      } catch (cleanupError) {
        /*
         * Do not send a second response if the request already
         * completed. Session cleanup failures should be logged
         * by the application's operational error handling.
         */
        req.log?.error(
          { err: cleanupError },
          'Failed to close student import transaction session.',
        );
      }
    }
  }
}