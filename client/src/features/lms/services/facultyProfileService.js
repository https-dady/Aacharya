import api from '../../auth/services/api/axios.js';

const FACULTY_PROFILE_ENDPOINT = '/v1/faculty-profile/me';

function unwrapProfile(response) {
  const payload = response?.data;

  if (payload?.success !== true) {
    throw new Error(
      payload?.error?.message
      || payload?.message
      || 'The faculty profile request could not be completed.',
    );
  }

  const profile = payload?.data?.profile;

  if (!profile || typeof profile !== 'object') {
    throw new Error(
      'The server returned an invalid faculty profile.',
    );
  }

  return profile;
}

const facultyProfileService = {
  async getMyProfile() {
    const response = await api.get(FACULTY_PROFILE_ENDPOINT);

    return unwrapProfile(response);
  },

  async updateMyProfile(profileData) {
    if (!profileData || typeof profileData !== 'object') {
      throw new Error('Valid profile data is required.');
    }

    const payload = {};

    if (Object.hasOwn(profileData, 'fullName')) {
      payload.fullName = profileData.fullName;
    }

    if (Object.hasOwn(profileData, 'email')) {
      payload.email = profileData.email;
    }

    if (Object.keys(payload).length === 0) {
      throw new Error('Provide a name or email address to update.');
    }

    const response = await api.patch(
      FACULTY_PROFILE_ENDPOINT,
      payload,
    );

    return unwrapProfile(response);
  },
};

export default facultyProfileService;