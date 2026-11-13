import api from '../../auth/services/api/axios.js';

const FACULTY_QUIZ_RESULTS_ENDPOINT = '/v1/quiz-results/faculty';

function unwrapResponse(response) {
  const body = response?.data;

  if (body?.success !== true || !body.data) {
    throw new Error(
      body?.error?.message ||
        body?.message ||
        'Unable to retrieve quiz result details.',
    );
  }

  return body.data;
}

function normalizeStudent(student) {
  if (!student || typeof student !== 'object') {
    return null;
  }

  return {
    id: String(student.id ?? ''),
    fullName: student.fullName ?? 'Unknown Student',
    institutionalId: student.institutionalId ?? '',
    email: student.email ?? null,
  };
}

function normalizeQuiz(quiz) {
  if (!quiz || typeof quiz !== 'object') {
    return null;
  }

  return {
    id: String(quiz.id ?? ''),
    title: quiz.title ?? 'Untitled Quiz',
    description: quiz.description ?? '',
    status: quiz.status ?? 'UNKNOWN',
    startAt: quiz.startAt ?? null,
    endAt: quiz.endAt ?? null,
    durationMinutes: quiz.durationMinutes ?? null,
  };
}

function normalizeCourse(course) {
  if (!course || typeof course !== 'object') {
    return null;
  }

  return {
    id: String(course.id ?? ''),
    title: course.title ?? 'Course unavailable',
    code: course.code ?? '',
    semester: course.semester ?? '',
  };
}

function normalizeAttempt(attempt) {
  if (!attempt || typeof attempt !== 'object') {
    return null;
  }

  return {
    id: String(attempt.id ?? ''),
    status: attempt.status ?? 'UNKNOWN',
    startedAt: attempt.startedAt ?? null,
    expiresAt: attempt.expiresAt ?? null,
    submittedAt: attempt.submittedAt ?? null,
  };
}

function normalizeScore(score) {
  if (!score || typeof score !== 'object') {
    return null;
  }

  return {
    obtainedMarks:
      typeof score.obtainedMarks === 'number'
        ? score.obtainedMarks
        : null,

    totalMarks:
      typeof score.totalMarks === 'number'
        ? score.totalMarks
        : null,

    percentage:
      typeof score.percentage === 'number'
        ? score.percentage
        : null,

    answeredQuestions: Number(score.answeredQuestions ?? 0),
    unansweredQuestions: Number(score.unansweredQuestions ?? 0),
    correctAnswers: Number(score.correctAnswers ?? 0),
    incorrectAnswers: Number(score.incorrectAnswers ?? 0),
    totalQuestions: Number(score.totalQuestions ?? 0),
  };
}

function normalizeQuestion(question) {
  if (!question || typeof question !== 'object') {
    return null;
  }

  return {
    questionId: String(question.questionId ?? ''),
    questionNumber: Number(question.questionNumber ?? 0),
    question: question.question ?? '',

    options: Array.isArray(question.options)
      ? question.options.map((option) => ({
          index: Number(option.index),
          text: option.text ?? '',
        }))
      : [],

    selectedOptionIndex:
      Number.isInteger(question.selectedOptionIndex)
        ? question.selectedOptionIndex
        : null,

    selectedOption: question.selectedOption ?? null,

    correctOptionIndex:
      Number.isInteger(question.correctOptionIndex)
        ? question.correctOptionIndex
        : null,

    correctOption: question.correctOption ?? null,

    isAnswered: Boolean(question.isAnswered),
    isCorrect: Boolean(question.isCorrect),

    marks: Number(question.marks ?? 0),
    marksAwarded: Number(question.marksAwarded ?? 0),

    answeredAt: question.answeredAt ?? null,
  };
}

const facultyQuizResultDetailsService = {
  /**
   * Retrieve one submitted student quiz attempt.
   *
   * GET /v1/quiz-results/faculty/:attemptId
   */
  async getResultDetails(attemptId) {
    if (!attemptId || typeof attemptId !== 'string') {
      throw new Error('A valid quiz attempt ID is required.');
    }

    const response = await api.get(
      `${FACULTY_QUIZ_RESULTS_ENDPOINT}/${encodeURIComponent(attemptId)}`,
    );

    const data = unwrapResponse(response);

    if (
      !data.attempt ||
      !data.student ||
      !data.quiz ||
      !data.course ||
      !data.score ||
      !Array.isArray(data.questions)
    ) {
      throw new Error(
        'The server returned an invalid quiz result details response.',
      );
    }

    return {
      attempt: normalizeAttempt(data.attempt),
      student: normalizeStudent(data.student),
      quiz: normalizeQuiz(data.quiz),
      course: normalizeCourse(data.course),
      score: normalizeScore(data.score),

      questions: data.questions
        .map(normalizeQuestion)
        .filter(Boolean),
    };
  },
};

export default facultyQuizResultDetailsService;