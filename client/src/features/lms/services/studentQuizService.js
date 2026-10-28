import api from '../../auth/services/api/axios.js';

const QUIZZES_ENDPOINT = '/v1/quizzes';

function unwrapResponse(response) {
  const payload = response?.data;

  if (!payload || payload.success !== true) {
    throw new Error(
      payload?.error?.message ||
        payload?.message ||
        'The quiz request could not be completed.',
    );
  }

  return payload.data;
}

function normalizeQuiz(quiz) {
  if (!quiz || typeof quiz !== 'object') {
    return null;
  }

  return {
    id: String(quiz.id ?? quiz._id ?? ''),
    title: quiz.title ?? 'Untitled Quiz',
    description: quiz.description ?? '',
    courseName: quiz.courseName ?? '',
    courseCode: quiz.courseCode ?? '',
    startAt: quiz.startAt ?? null,
    endAt: quiz.endAt ?? null,
    durationMinutes: Number(quiz.durationMinutes),
    totalMarks: Number(quiz.totalMarks),
    status: String(quiz.status ?? 'unknown').toLowerCase(),
    createdAt: quiz.createdAt ?? null,
    updatedAt: quiz.updatedAt ?? null,
  };
}

function normalizeAttempt(attempt) {
  if (!attempt || typeof attempt !== 'object') {
    return null;
  }

  return {
    id: String(attempt.id ?? attempt._id ?? ''),
    quizId: String(attempt.quizId ?? attempt.quiz ?? ''),
    status: String(attempt.status ?? 'unknown').toUpperCase(),
    startedAt: attempt.startedAt ?? null,
    expiresAt: attempt.expiresAt ?? null,
    submittedAt: attempt.submittedAt ?? null,
    totalMarks: Number(attempt.totalMarks ?? 0),
    score:
      attempt.score === null || attempt.score === undefined
        ? null
        : Number(attempt.score),
    answers: Array.isArray(attempt.answers)
      ? attempt.answers.map((answer) => ({
          questionId: String(
            answer.questionId?._id ??
              answer.questionId ??
              '',
          ),
          selectedOptionIndex:
            answer.selectedOptionIndex ?? null,
          answeredAt: answer.answeredAt ?? null,
        }))
      : [],
    quiz: attempt.quiz
      ? {
          title: attempt.quiz.title ?? 'Untitled Quiz',
          description: attempt.quiz.description ?? '',
          durationMinutes: Number(
            attempt.quiz.durationMinutes ?? 0,
          ),
          totalMarks: Number(attempt.quiz.totalMarks ?? 0),
        }
      : null,
    questions: Array.isArray(attempt.questions)
      ? attempt.questions.map((question) => ({
          id: String(question.id ?? question._id ?? ''),
          questionText: question.questionText ?? '',
          options: Array.isArray(question.options)
            ? question.options.map((option) => ({
                label: option.label ?? '',
                text: option.text ?? '',
              }))
            : [],
          marks: Number(question.marks ?? 0),
        }))
      : [],
  };
}

function requireIdentifier(value, label) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} is required.`);
  }

  return value.trim();
}

const studentQuizService = {
  /**
   * Fetch quizzes available to the authenticated student.
   */
  async getMyQuizzes() {
    const response = await api.get(`${QUIZZES_ENDPOINT}/me`);
    const data = unwrapResponse(response);

    if (!Array.isArray(data)) {
      throw new Error('The server returned an invalid quiz list.');
    }

    return data.map(normalizeQuiz).filter(Boolean);
  },

  /**
   * Get a quiz from the student's accessible quiz list.
   *
   * The current backend does not expose a separate quiz-details
   * endpoint, so this method uses the existing student quiz list.
   */
  async getMyQuizById(quizId) {
    const id = requireIdentifier(quizId, 'Quiz ID');
    const quizzes = await this.getMyQuizzes();

    return quizzes.find((quiz) => quiz.id === id) ?? null;
  },

  /**
   * Start a new attempt or resume an existing in-progress attempt.
   */
  async startQuizAttempt(quizId) {
    const id = requireIdentifier(quizId, 'Quiz ID');

    const response = await api.post(
      `${QUIZZES_ENDPOINT}/${encodeURIComponent(id)}/attempts`,
    );

    const attempt = normalizeAttempt(unwrapResponse(response));

    if (!attempt?.id) {
      throw new Error('The server returned an invalid quiz attempt.');
    }

    return attempt;
  },

  /**
   * Retrieve an attempt owned by the authenticated student.
   */
  async getQuizAttempt(attemptId) {
    const id = requireIdentifier(attemptId, 'Attempt ID');

    const response = await api.get(
      `${QUIZZES_ENDPOINT}/attempts/${encodeURIComponent(id)}`,
    );

    const attempt = normalizeAttempt(unwrapResponse(response));

    if (!attempt?.id) {
      throw new Error('The server returned an invalid quiz attempt.');
    }

    return attempt;
  },

  /**
   * Save or update one answer.
   *
   * selectedOptionIndex can be null to clear the answer.
   */
  async saveQuizAnswer({
    attemptId,
    questionId,
    selectedOptionIndex,
  }) {
    const id = requireIdentifier(attemptId, 'Attempt ID');
    const question = requireIdentifier(questionId, 'Question ID');

    if (
      selectedOptionIndex !== null &&
      (
        !Number.isInteger(selectedOptionIndex) ||
        selectedOptionIndex < 0
      )
    ) {
      throw new Error(
        'Selected option index must be a non-negative integer or null.',
      );
    }

    const response = await api.patch(
      `${QUIZZES_ENDPOINT}/attempts/${encodeURIComponent(id)}/answers`,
      {
        questionId: question,
        selectedOptionIndex,
      },
    );

    const attempt = normalizeAttempt(unwrapResponse(response));

    if (!attempt?.id) {
      throw new Error('The server returned an invalid quiz attempt.');
    }

    return attempt;
  },

  /**
   * Submit the attempt and receive the server-calculated result.
   */
  async submitQuizAttempt(attemptId) {
    const id = requireIdentifier(attemptId, 'Attempt ID');

    const response = await api.post(
      `${QUIZZES_ENDPOINT}/attempts/${encodeURIComponent(id)}/submit`,
    );

    const attempt = normalizeAttempt(unwrapResponse(response));

    if (!attempt?.id) {
      throw new Error('The server returned an invalid quiz attempt.');
    }

    return attempt;
  },
};

export default studentQuizService;