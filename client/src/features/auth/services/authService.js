import api from '../../../services/api/axios.js';

const AUTH_BASE_URL = '/v1/auth';

const authService = {
  async login({ institutionalId, password }) {
    const response = await api.post(`${AUTH_BASE_URL}/login`, {
      institutionalId,
      password,
    });

    return response.data;
  },

  async refreshToken() {
    const response = await api.post(`${AUTH_BASE_URL}/refresh`);

    return response.data;
  },

  async logout() {
    const response = await api.post(`${AUTH_BASE_URL}/logout`);

    return response.data;
  },

  async requestEmailVerification() {
    const response = await api.post(
      `${AUTH_BASE_URL}/email/verification/request`,
    );

    return response.data;
  },

  async confirmEmailVerification({ challengeId, otp }) {
    const response = await api.post(
      `${AUTH_BASE_URL}/email/verification/confirm`,
      {
        challengeId,
        otp,
      },
    );

    return response.data;
  },

  async requestPasswordReset({ email }) {
    const response = await api.post(
      `${AUTH_BASE_URL}/password/reset/request`,
      { email },
    );

    return response.data;
  },

  async verifyPasswordResetOtp({ challengeId, otp }) {
    const response = await api.post(
      `${AUTH_BASE_URL}/password/reset/verify`,
      {
        challengeId,
        otp,
      },
    );

    return response.data;
  },

  async confirmPasswordReset({ resetToken, newPassword }) {
    const response = await api.post(
      `${AUTH_BASE_URL}/password/reset/confirm`,
      {
        resetToken,
        newPassword,
      },
    );

    return response.data;
  },
};

export default authService;