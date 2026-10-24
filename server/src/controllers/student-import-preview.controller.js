import mongoose from 'mongoose';

import {
  parseStudentCsv,
  StudentImportError,
} from '../services/provisioning/student-import.service.js';

import {
  readStudentXlsx,
} from '../services/provisioning/student-xlsx-reader.service.js';

import {
  previewStudentImport,
  StudentImportPreviewError,
} from '../services/provisioning/student-import-preview.service.js';

const MAX_IMPORT_SIZE = 1024 * 1024;
const MAX_STUDENTS_PER_IMPORT = 500;

function sendError(res, error) {
  const statusCode =
    Number.isInteger(error.statusCode) &&
    error.statusCode >= 400 &&
    error.statusCode < 600
      ? error.statusCode
      : 400;

  return res.status(statusCode).json({
    success: false,
    message: error.message || 'Unable to preview student import.',
    errors: Array.isArray(error.details)
      ? error.details
      : [],
  });
}

export async function previewStudentImportController(
  req,
  res,
  next,
) {
  try {
    const mentorId = req.user?.id;
    const { sectionId } = req.params;

    if (!mongoose.isValidObjectId(mentorId)) {
      return res.status(401).json({
        success: false,
        message: 'A valid authenticated user is required.',
      });
    }

    if (!mongoose.isValidObjectId(sectionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid section ID.',
      });
    }

    const csvContent = req.body?.csvContent;

    const hasCsvContent =
      typeof csvContent === 'string' &&
      csvContent.trim().length > 0;

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
          csvContent,
          'utf8',
        );

        if (csvSize > MAX_IMPORT_SIZE) {
          return res.status(413).json({
            success: false,
            message: 'CSV content must not exceed 1 MB.',
          });
        }

        rows = parseStudentCsv(csvContent);
      }
    } catch (error) {
      if (error instanceof StudentImportError) {
        return sendError(res, error);
      }

      throw error;
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'The import contains no student records.',
      });
    }

    if (rows.length > MAX_STUDENTS_PER_IMPORT) {
      return res.status(400).json({
        success: false,
        message:
          `A maximum of ${MAX_STUDENTS_PER_IMPORT} students can be previewed at once.`,
      });
    }

    /*
     * The preview service only receives the fields it needs.
     * Passwords are intentionally excluded from its input.
     * No student accounts are created by this controller.
     */
    const previewRows = rows.map((row) => ({
      rowNumber: row.rowNumber,
      institutionalId: row.institutionalId,
      fullName: row.fullName,
      email: row.email,
    }));

    const preview = await previewStudentImport({
      mentorId,
      sectionId,
      rows: previewRows,
    });

    return res.status(200).json({
      success: true,
      message: 'Student import preview generated successfully.',
      data: preview,
    });
  } catch (error) {
    if (error instanceof StudentImportPreviewError) {
      return sendError(res, error);
    }

    return next(error);
  }
}