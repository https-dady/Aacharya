import api from '../../auth/services/api/axios.js';

const STUDENT_PROFILE_ENDPOINT = '/v1/students/me';

const studentProfileService = {
  async getMyProfile() {
    const response = await api.get(STUDENT_PROFILE_ENDPOINT);

    const profile = response?.data?.data?.profile;

    if (!profile || typeof profile !== 'object') {
      throw new Error(
        'The server returned an invalid student profile response.',
      );
    }

    return profile;
  },
};

export default studentProfileService;