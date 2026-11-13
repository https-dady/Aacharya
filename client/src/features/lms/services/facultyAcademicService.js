import api from '../../auth/services/api/axios.js';

import assignmentManagementService from './assignmentManagementService.js';
import quizManagementService from './quizManagementService.js';

const ASSIGNED_COURSES_ENDPOINT = '/v1/courses/assigned-to-me';

const DASHBOARD_PAGE_SIZE = 100;

function unwrapResponse(response, fallbackMessage) {
  const payload = response?.data;

  if (!payload || payload.success !== true) {
    throw new Error(
      payload?.error?.message ||
        payload?.message ||
        fallbackMessage,
    );
  }

  return payload.data;
}

function normalizeId(value) {
  if (!value) return '';

  if (typeof value === 'object') {
    return String(value.id ?? value._id ?? '');
  }

  return String(value);
}

function normalizeCourse(course) {
  if (!course || typeof course !== 'object') return null;

  const id = normalizeId(course.id ?? course._id);

  if (!id) return null;

  return {
    ...course,
    id,
    title: course.title ?? '',
    code: course.code ?? '',
    description: course.description ?? '',
    semester: course.semester ?? '',
    status: String(course.status ?? '').toUpperCase(),
    department: course.department ?? null,
    batches: Array.isArray(course.batches) ? course.batches : [],
    sections: Array.isArray(course.sections) ? course.sections : [],
  };
}

function normalizeAssignedCourses(data) {
  if (!data || !Array.isArray(data.courses)) {
    throw new Error(
      'The assigned courses endpoint returned an invalid response.',
    );
  }

  return {
    items: data.courses.map(normalizeCourse).filter(Boolean),
    total: Number(data.total ?? data.courses.length),
  };
}

function isFutureDate(value) {
  if (!value) return false;

  const timestamp = new Date(value).getTime();

  return Number.isFinite(timestamp) && timestamp >= Date.now();
}

function isOpenAssignment(assignment) {
  const status = String(assignment?.status ?? '').toUpperCase();

  return status === 'PUBLISHED' && isFutureDate(assignment.dueDate);
}

function isUpcomingQuiz(quiz) {
  const status = String(quiz?.status ?? '').toUpperCase();

  return (
    ['PUBLISHED', 'SCHEDULED', 'ACTIVE'].includes(status) &&
    isFutureDate(quiz.startAt)
  );
}

const facultyAcademicService = {
  async listAssignedCourses() {
    const response = await api.get(ASSIGNED_COURSES_ENDPOINT);

    return normalizeAssignedCourses(
      unwrapResponse(
        response,
        'Unable to retrieve your assigned courses.',
      ),
    );
  },

  async listAssignments(filters = {}) {
    return assignmentManagementService.listAssignments({
      page: filters.page ?? 1,
      limit: filters.limit ?? 20,
      ...(filters.search ? { search: filters.search } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.courseId ? { courseId: filters.courseId } : {}),
    });
  },

  async listQuizzes(filters = {}) {
    return quizManagementService.listQuizzes({
      page: filters.page ?? 1,
      limit: filters.limit ?? 20,
      ...(filters.search ? { search: filters.search } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.courseId ? { courseId: filters.courseId } : {}),
    });
  },

  async getDashboardOverview() {
    const [
      coursesResult,
      assignmentsResult,
      quizzesResult,
    ] = await Promise.allSettled([
      this.listAssignedCourses(),
      this.listAssignments({
        page: 1,
        limit: DASHBOARD_PAGE_SIZE,
      }),
      this.listQuizzes({
        page: 1,
        limit: DASHBOARD_PAGE_SIZE,
      }),
    ]);

    const courses =
      coursesResult.status === 'fulfilled'
        ? coursesResult.value.items
        : [];

    const assignments =
      assignmentsResult.status === 'fulfilled'
        ? assignmentsResult.value.items
        : [];

    const quizzes =
      quizzesResult.status === 'fulfilled'
        ? quizzesResult.value.items
        : [];

    const upcomingAssignments = assignments
      .filter(isOpenAssignment)
      .sort(
        (first, second) =>
          new Date(first.dueDate).getTime() -
          new Date(second.dueDate).getTime(),
      );

    const upcomingQuizzes = quizzes
      .filter(isUpcomingQuiz)
      .sort(
        (first, second) =>
          new Date(first.startAt).getTime() -
          new Date(second.startAt).getTime(),
      );

    const errors = [];

    if (coursesResult.status === 'rejected') {
      errors.push({
        section: 'courses',
        message: coursesResult.reason?.message,
      });
    }

    if (assignmentsResult.status === 'rejected') {
      errors.push({
        section: 'assignments',
        message: assignmentsResult.reason?.message,
      });
    }

    if (quizzesResult.status === 'rejected') {
      errors.push({
        section: 'quizzes',
        message: quizzesResult.reason?.message,
      });
    }

    return {
      courses: {
        items: courses,
        total:
          coursesResult.status === 'fulfilled'
            ? coursesResult.value.total
            : 0,
      },

      assignments: {
        items: assignments,
        total:
          assignmentsResult.status === 'fulfilled'
            ? assignmentsResult.value.pagination?.total ?? assignments.length
            : 0,
        upcoming: upcomingAssignments,
        upcomingCount: upcomingAssignments.length,
      },

      quizzes: {
        items: quizzes,
        total:
          quizzesResult.status === 'fulfilled'
            ? quizzesResult.value.pagination?.total ?? quizzes.length
            : 0,
        upcoming: upcomingQuizzes,
        upcomingCount: upcomingQuizzes.length,
      },

      summary: {
        assignedCourses: courses.length,
        totalAssignments: assignmentsResult.status === 'fulfilled'
          ? assignmentsResult.value.pagination?.total ?? assignments.length
          : 0,
        upcomingAssignments: upcomingAssignments.length,
        upcomingQuizzes: upcomingQuizzes.length,
      },

      errors,
      hasErrors: errors.length > 0,
      generatedAt: new Date().toISOString(),
    };
  },
};

export default facultyAcademicService;