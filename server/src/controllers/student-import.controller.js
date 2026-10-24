import mongoose from 'mongoose';
import { User, USER_ROLES, ACCOUNT_STATUSES } from '../models/user.model.js';
import Batch from '../models/batch.model.js';
import Section from '../models/section.model.js';
import { hashPassword } from '../services/auth/password.service.js';
import {
  parseStudentCsv,
  StudentImportError,
} from '../services/provisioning/student-import.service.js';

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
    const { csvContent } = req.body;

    if (!mongoose.isValidObjectId(sectionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid section ID.',
      });
    }

    if (
      typeof csvContent !== 'string' ||
      Buffer.byteLength(csvContent, 'utf8') > 1024 * 1024
    ) {
      return res.status(400).json({
        success: false,
        message: 'Provide valid CSV content within the 1 MB limit.',
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

    let rows;

    try {
      rows = parseStudentCsv(csvContent);
    } catch (error) {
      if (error instanceof StudentImportError) {
        return res.status(400).json({
          success: false,
          message: error.message,
          errors: error.details,
        });
      }

      throw error;
    }

    const institutionalIds = rows.map((row) => row.institutionalId);
    const normalizedIds = institutionalIds.map((id) => id.toLowerCase());

    if (new Set(normalizedIds).size !== normalizedIds.length) {
      return res.status(400).json({
        success: false,
        message: 'The CSV contains duplicate institutional IDs.',
      });
    }

    const existingStudents = await User.find({
      institutionalId: { $in: institutionalIds },
    }).select('institutionalId');

    if (existingStudents.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Some institutional IDs already exist.',
        conflicts: existingStudents.map((student) => student.institutionalId),
      });
    }

    const emailAddresses = rows
      .filter((row) => row.email)
      .map((row) => row.email.toLowerCase());

    if (new Set(emailAddresses).size !== emailAddresses.length) {
      return res.status(400).json({
        success: false,
        message: 'The CSV contains duplicate email addresses.',
      });
    }

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

    const students = [];

    for (const row of rows) {
      students.push({
        institutionalId: row.institutionalId,
        fullName: row.fullName,
        email: row.email?.toLowerCase(),
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
    return next(error);
  }
}