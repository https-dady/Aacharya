import api from '../../auth/services/api/axios.js';

const STUDENT_COURSES_ENDPOINT = '/v1/courses/me';

const studentCourseService = {
  async getMyCourses() {
    const response = await api.get(STUDENT_COURSES_ENDPOINT);
    const courses = response?.data?.data?.courses;

    if (!Array.isArray(courses)) {
      throw new Error(
        'The server returned an invalid student courses response.',
      );
    }

    return courses;
  },
};

export default studentCourseService;