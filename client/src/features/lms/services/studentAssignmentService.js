import api from '../../auth/services/api/axios.js';

const STUDENT_ASSIGNMENTS_ENDPOINT = '/v1/assignments/me';

const studentAssignmentService = {
  async getMyAssignments() {
    const response = await api.get(STUDENT_ASSIGNMENTS_ENDPOINT);
    const assignments = response?.data?.data?.assignments;

    if (!Array.isArray(assignments)) {
      throw new Error(
        'The server returned an invalid student assignments response.',
      );
    }

    return assignments;
  },
};

export default studentAssignmentService;