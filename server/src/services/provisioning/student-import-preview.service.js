import mongoose from 'mongoose';

import {
  User,
  USER_ROLES,
  ACCOUNT_STATUSES,
} from '../../models/user.model.js';

import { Batch } from '../../models/batch.model.js';
import { Section } from '../../models/section.model.js';

const MAX_STUDENTS_PER_IMPORT = 500;

export class StudentImportPreviewError extends Error {
  constructor(message, statusCode = 400, details = []) {
    super(message);

    this.name = 'StudentImportPreviewError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

function normalizeInstitutionalId(value) {
  return String(value ?? '').trim().toUpperCase();
}

function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase();
}

/**
 * Generates an import preview without creating or modifying
 * any student accounts.
 *
 * The preview:
 * - Verifies the active mentor.
 * - Verifies the mentor's section and batch assignments.
 * - Detects institutional IDs already present in the database.
 * - Detects email addresses already present in the database.
 * - Returns row-level conflict information.
 * - Never returns passwords or password hashes.
 */
export async function previewStudentImport({
  mentorId,
  sectionId,
  rows,
}) {
  if (!mongoose.isValidObjectId(mentorId)) {
    throw new StudentImportPreviewError(
      'Invalid mentor ID.',
      400,
    );
  }

  if (!mongoose.isValidObjectId(sectionId)) {
    throw new StudentImportPreviewError(
      'Invalid section ID.',
      400,
    );
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new StudentImportPreviewError(
      'The import contains no student records.',
      400,
    );
  }

  if (rows.length > MAX_STUDENTS_PER_IMPORT) {
    throw new StudentImportPreviewError(
      `A maximum of ${MAX_STUDENTS_PER_IMPORT} students can be previewed at once.`,
      400,
    );
  }

  const mentor = await User.findOne({
    _id: mentorId,
    role: USER_ROLES.MENTOR,
    status: ACCOUNT_STATUSES.ACTIVE,
  })
    .select('_id department assignedBatches assignedSections')
    .lean();

  if (!mentor) {
    throw new StudentImportPreviewError(
      'Only active mentors can preview student imports.',
      403,
    );
  }

  const normalizedSectionId = String(sectionId);

  const assignedSections = (mentor.assignedSections || []).map(
    (id) => String(id),
  );

  if (!assignedSections.includes(normalizedSectionId)) {
    throw new StudentImportPreviewError(
      'You are not assigned to this section.',
      403,
    );
  }

  const section = await Section.findOne({
    _id: sectionId,
    status: 'ACTIVE',
    department: mentor.department,
  })
    .select('_id name code batch department status')
    .lean();

  if (!section) {
    throw new StudentImportPreviewError(
      'Active section not found in your department.',
      404,
    );
  }

  const assignedBatches = (mentor.assignedBatches || []).map(
    (id) => String(id),
  );

  if (!assignedBatches.includes(String(section.batch))) {
    throw new StudentImportPreviewError(
      'You are not assigned to the batch containing this section.',
      403,
    );
  }

  const batch = await Batch.findOne({
    _id: section.batch,
    department: mentor.department,
    status: 'ACTIVE',
  })
    .select('_id name code academicYear department status')
    .lean();

  if (!batch) {
    throw new StudentImportPreviewError(
      'The section does not belong to an active batch.',
      400,
    );
  }

  const preparedRows = rows.map((row, index) => {
    const institutionalId = normalizeInstitutionalId(
      row.institutionalId,
    );

    const email = row.email
      ? normalizeEmail(row.email)
      : undefined;

    if (!institutionalId) {
      throw new StudentImportPreviewError(
        'A student record is missing its institutional ID.',
        400,
        [
          {
            row: row.rowNumber ?? index + 2,
            message: 'institutionalId is required.',
          },
        ],
      );
    }

    return {
      rowNumber: row.rowNumber ?? index + 2,
      institutionalId,
      fullName: String(row.fullName ?? '').trim(),
      email,
    };
  });

  /*
   * Detect duplicates inside the supplied rows as a defensive
   * check, even though the CSV/XLSX parsers already validate them.
   */
  const firstIdRow = new Map();
  const firstEmailRow = new Map();
  const inputErrors = [];

  for (const row of preparedRows) {
    const idKey = row.institutionalId;

    if (firstIdRow.has(idKey)) {
      inputErrors.push({
        row: row.rowNumber,
        field: 'institutionalId',
        message:
          `Institutional ID also appears on row ${firstIdRow.get(idKey)}.`,
      });
    } else {
      firstIdRow.set(idKey, row.rowNumber);
    }

    if (row.email) {
      const emailKey = row.email;

      if (firstEmailRow.has(emailKey)) {
        inputErrors.push({
          row: row.rowNumber,
          field: 'email',
          message:
            `Email address also appears on row ${firstEmailRow.get(emailKey)}.`,
        });
      } else {
        firstEmailRow.set(emailKey, row.rowNumber);
      }
    }
  }

  if (inputErrors.length > 0) {
    throw new StudentImportPreviewError(
      'The import file contains duplicate records.',
      400,
      inputErrors,
    );
  }

  const institutionalIds = preparedRows.map(
    (row) => row.institutionalId,
  );

  const emailAddresses = preparedRows
    .map((row) => row.email)
    .filter(Boolean);

  /*
   * Query existing records in batches instead of performing
   * one database query per imported student.
   *
   * These checks are global because institutional IDs and
   * email addresses are unique across the User collection.
   */
  const existingUsers = await User.find({
    $or: [
      {
        institutionalId: {
          $in: institutionalIds,
        },
      },
      ...(emailAddresses.length > 0
        ? [
            {
              email: {
                $in: emailAddresses,
              },
            },
          ]
        : []),
    ],
  })
    .select('institutionalId email')
    .lean();

  const existingIds = new Set();
  const existingEmails = new Set();

  for (const user of existingUsers) {
    if (user.institutionalId) {
      existingIds.add(
        normalizeInstitutionalId(user.institutionalId),
      );
    }

    if (user.email) {
      existingEmails.add(normalizeEmail(user.email));
    }
  }

  const previewRows = preparedRows.map((row) => {
    const conflicts = [];

    if (existingIds.has(row.institutionalId)) {
      conflicts.push({
        field: 'institutionalId',
        code: 'INSTITUTIONAL_ID_EXISTS',
        message:
          'This institutional ID already exists in the system.',
      });
    }

    if (
      row.email &&
      existingEmails.has(row.email)
    ) {
      conflicts.push({
        field: 'email',
        code: 'EMAIL_EXISTS',
        message:
          'This email address already exists in the system.',
      });
    }

    return {
      row: row.rowNumber,
      institutionalId: row.institutionalId,
      fullName: row.fullName,
      email: row.email ?? null,
      status: conflicts.length > 0 ? 'CONFLICT' : 'READY',
      conflicts,
    };
  });

  const conflictCount = previewRows.filter(
    (row) => row.status === 'CONFLICT',
  ).length;

  const readyCount = previewRows.length - conflictCount;

  return {
    section: {
      id: String(section._id),
      name: section.name,
      code: section.code,
    },

    batch: {
      id: String(batch._id),
      name: batch.name,
      code: batch.code,
      academicYear: batch.academicYear,
    },

    summary: {
      totalRows: previewRows.length,
      readyCount,
      conflictCount,
      canImport: conflictCount === 0 && readyCount > 0,
    },

    rows: previewRows,
  };
}