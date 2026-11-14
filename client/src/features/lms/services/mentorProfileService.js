import api from '../../auth/services/api/axios.js';

const PROFILE_ENDPOINT = '/v1/provisioning/mentor/profile';

function unwrapProfile(response) {
  const payload = response?.data;

  if (payload?.success !== true) {
    throw new Error(
      payload?.error?.message
      || payload?.message
      || 'Unable to retrieve your mentor profile.',
    );
  }

  const profile = payload?.data?.profile;

  if (!profile || typeof profile !== 'object') {
    throw new Error('The server returned an invalid mentor profile.');
  }

  return profile;
}

const mentorProfileService = {
  async getMyProfile(options = {}) {
    const response = await api.get(
      PROFILE_ENDPOINT,
      options.signal
        ? { signal: options.signal }
        : undefined,
    );

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
      PROFILE_ENDPOINT,
      payload,
    );

    return unwrapProfile(response);
  },
};

export default mentorProfileService;