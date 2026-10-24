import mongoose from 'mongoose';
import { User, USER_ROLES, ACCOUNT_STATUSES } from '../models/user.model.js';
import Batch from '../models/batch.model.js';
import Section from '../models/section.model.js';
import { hashPassword } from '../services/auth/password.service.js';
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
    return String(value || '').trim().toLowerCase();
}

export async function importStudentsController(req, res, next) {
    try {
        const mentor = await User.findById(req.user?.id);

        if (
            !mentor ||
            mentor.status !== ACCOUNT_STATUSES.ACTIVE ||
            mentor.role !== USER_ROLES.MENTOR
        ) {
            return res.status(403).json({
                success: false,
                message: 'Only active mentors can import students.',
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
                message: 'Provide either CSV content or one XLSX file, not both.',
            });
        }

        let rows;

        try {
            if (hasXlsxFile) {
                if (req.file.buffer.length > MAX_IMPORT_SIZE) {
                    return res.status(400).json({
                        success: false,
                        message: 'The XLSX file must not exceed 1 MB.',
                    });
                }

                rows = await readStudentXlsx(req.file.buffer);
            } else {
                if (
                    Buffer.byteLength(req.body.csvContent, 'utf8') >
                    MAX_IMPORT_SIZE
                ) {
                    return res.status(400).json({
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
                message: `A maximum of ${MAX_STUDENTS_PER_IMPORT} students can be imported at once.`,
            });
        }

        const section = await Section.findOne({
            _id: sectionId,
            status: 'ACTIVE',
        });

        if (!section) {
            return res.status(404).json({
                success: false,
                message: 'Active section not found.',
            });
        }

        const assignedSectionIds = (mentor.assignedSections || []).map(
            (id) => id.toString(),
        );

        if (!assignedSectionIds.includes(section._id.toString())) {
            return res.status(403).json({
                success: false,
                message: 'You are not assigned to this section.',
            });
        }

        const batch = await Batch.findOne({
            _id: section.batch,
            department: section.department,
            status: 'ACTIVE',
        });

        if (!batch) {
            return res.status(400).json({
                success: false,
                message: 'The section does not belong to an active batch.',
            });
        }

        const assignedBatchIds = (mentor.assignedBatches || []).map(
            (id) => id.toString(),
        );

        if (!assignedBatchIds.includes(batch._id.toString())) {
            return res.status(403).json({
                success: false,
                message: 'You are not assigned to this batch.',
            });
        }

        const institutionalIds = rows.map((row) =>
            String(row.institutionalId).trim().toUpperCase(),
        );

        const normalizedIds = institutionalIds.map(normalizeIdentifier);
        if (new Set(normalizedIds).size !== normalizedIds.length) {
            return res.status(400).json({
                success: false,
                message: 'The import file contains duplicate institutional IDs.',
            });
        }

        const existingStudents = await User.find({
            institutionalId: { $in: institutionalIds },
        }).select('institutionalId');

        if (existingStudents.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Some institutional IDs already exist.',
                conflicts: existingStudents.map(
                    (student) => student.institutionalId,
                ),
            });
        }

        const emailAddresses = rows
            .filter((row) => row.email)
            .map((row) => row.email.trim().toLowerCase());

        if (new Set(emailAddresses).size !== emailAddresses.length) {
            return res.status(400).json({
                success: false,
                message: 'The import file contains duplicate email addresses.',
            });
        }

        if (emailAddresses.length > 0) {
            const existingEmails = await User.find({
                email: { $in: emailAddresses },
            }).select('email');

            if (existingEmails.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'Some email addresses already exist.',
                    conflicts: existingEmails.map((user) => user.email),
                });
            }
        }

        const students = [];

        for (const row of rows) {
            students.push({
                institutionalId: String(row.institutionalId).trim(),
                fullName: String(row.fullName).trim(),
                email: row.email?.trim().toLowerCase() || undefined,
                passwordHash: await hashPassword(row.password),
                role: USER_ROLES.STUDENT,
                status: ACCOUNT_STATUSES.ACTIVE,
                department: section.department,
                assignedBatches: [batch._id],
                assignedSections: [section._id],
                createdBy: mentor._id,
                isEmailVerified: false,
            });
        }

        const createdStudents = await User.insertMany(students, {
            ordered: true,
        });

        return res.status(201).json({
            success: true,
            message: 'Students imported successfully.',
            data: {
                sectionId: section._id,
                batchId: batch._id,
                importedCount: createdStudents.length,
                students: createdStudents.map((student) => ({
                    id: student._id,
                    institutionalId: student.institutionalId,
                    fullName: student.fullName,
                    email: student.email,
                })),
            },
        });
      } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({
        success: false,
        message: 'One or more student records failed database validation.',
      });
    }

    if (error?.code === 11000) {
      const duplicateFields = Object.keys(error.keyPattern || {});

      const message = duplicateFields.includes('institutionalId')
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

    return next(error);
  }
}