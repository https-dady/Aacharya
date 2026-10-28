import mongoose from 'mongoose';

import { Attendance } from '../models/attendance.model.js';

function getAuthenticatedStudentId(req) {
  const studentId = req.user?.id || req.user?._id;

  if (!studentId || !mongoose.isValidObjectId(studentId)) {
    return null;
  }

  return studentId;
}

function normalizeAttendanceRecord(record) {
  const course = record.course;
  const faculty = record.markedBy;

  return {
    id: String(record._id),
    subjectName:
      course?.title ||
      course?.name ||
      'Course unavailable',
    subjectCode:
      course?.code ||
      course?.courseCode ||
      '',
    date: record.sessionDate,
    status: String(record.status || '').toLowerCase(),
    facultyName: faculty?.fullName || '',
    sessionKey: record.sessionKey,
    remarks: record.remarks || '',
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export async function listMyAttendanceController(req, res, next) {
  try {
    const studentId = getAuthenticatedStudentId(req);

    if (!studentId) {
      return res.status(401).json({
        success: false,
        message: 'A valid authenticated student account is required.',
      });
    }

    const attendanceRecords = await Attendance.find({
      student: studentId,
    })
      .select(
        'course sessionDate sessionKey status markedBy remarks createdAt updatedAt',
      )
      .populate({
        path: 'course',
        select: 'title name code courseCode',
      })
      .populate({
        path: 'markedBy',
        select: 'fullName',
      })
      .sort({
        sessionDate: -1,
        createdAt: -1,
      })
      .lean()
      .exec();

    const results = attendanceRecords.map(normalizeAttendanceRecord);

    return res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    return next(error);
  }
}