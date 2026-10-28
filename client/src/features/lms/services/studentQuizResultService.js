import api from '../../auth/services/api/axios.js';

function normalizeQuizResult(result) {
  return {
    id: String(result.id ?? result.attemptId ?? ''),
    attemptId: String(result.attemptId ?? result.id ?? ''),
    quizId: String(result.quizId ?? ''),
    title: result.title ?? 'Quiz',
    courseName: result.courseName ?? 'Course unavailable',
    courseCode: result.courseCode ?? '',
    obtainedMarks:
      typeof result.obtainedMarks === 'number'
        ? result.obtainedMarks
        : null,
    totalMarks:
      typeof result.totalMarks === 'number'
        ? result.totalMarks
        : null,
    percentage:
      typeof result.percentage === 'number'
        ? result.percentage
        : null,
    status: result.status ?? 'published',
    startedAt: result.startedAt ?? null,
    submittedAt: result.submittedAt ?? null,
  };
}

const studentQuizResultService = {
  async getMyResults() {
    const response = await api.get('/v1/quiz-results/me');
    const body = response?.data;

    if (!body?.success || !Array.isArray(body.data)) {
      throw new Error(
        'The server returned an invalid quiz results response.',
      );
    }

    return body.data.map(normalizeQuizResult);
  },
};

export default studentQuizResultService;