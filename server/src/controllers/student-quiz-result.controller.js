import mongoose from 'mongoose';

import { QuizAttempt } from '../models/quiz-attempt.model.js';

function getAuthenticatedUserId(req) {
  const userId = req.user?.id || req.user?._id;

  if (!userId || !mongoose.isValidObjectId(userId)) {
    return null;
  }

  return userId;
}

export async function listMyQuizResultsController(req, res, next) {
  try {
    const studentId = getAuthenticatedUserId(req);

    if (!studentId) {
      return res.status(401).json({
        success: false,
        message: 'A valid authenticated student account is required.',
      });
    }

    const attempts = await QuizAttempt.find({
      student: studentId,
      status: 'SUBMITTED',
      submittedAt: { $ne: null },
    })
      .select(
        'quiz startedAt submittedAt score totalMarks status createdAt updatedAt',
      )
      .populate({
        path: 'quiz',
        select: 'title course totalMarks',
        populate: {
          path: 'course',
          select: 'title name code courseCode',
        },
      })
      .sort({ submittedAt: -1 })
      .lean();

    const results = attempts
      .filter((attempt) => attempt.quiz)
      .map((attempt) => {
        const quiz = attempt.quiz;
        const course = quiz.course;

        return {
          id: String(attempt._id),
          attemptId: String(attempt._id),
          quizId: String(quiz._id),
          title: quiz.title || 'Quiz',
          courseName:
            course?.title ||
            course?.name ||
            'Course unavailable',
          courseCode:
            course?.code ||
            course?.courseCode ||
            '',
          obtainedMarks:
            typeof attempt.score === 'number'
              ? attempt.score
              : null,
          totalMarks:
            typeof attempt.totalMarks === 'number'
              ? attempt.totalMarks
              : quiz.totalMarks ?? null,
          percentage:
            typeof attempt.score === 'number'
            && typeof attempt.totalMarks === 'number'
            && attempt.totalMarks > 0
              ? Number(
                (
                  (attempt.score / attempt.totalMarks) * 100
                ).toFixed(2),
              )
              : null,
          status: 'published',
          startedAt: attempt.startedAt,
          submittedAt: attempt.submittedAt,
        };
      });

    return res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    return next(error);
  }
}