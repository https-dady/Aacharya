import axios from 'axios';

const API_BASE_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
).replace(/\/+$/, '');

const ACCESS_TOKEN_KEY = 'aacharya_access_token';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 15000,
});

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 15000,
});

let refreshPromise = null;

function getAccessToken() {
  return sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

function setAccessToken(token) {
  if (typeof token === 'string' && token.trim()) {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
  } else {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  }
}

function clearAccessToken() {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
}

function extractAccessToken(response) {
  const body = response?.data;

  const token =
    body?.data?.accessToken ??
    body?.accessToken ??
    body?.data?.token ??
    body?.token;

  return typeof token === 'string' && token.trim()
    ? token
    : null;
}

function createRefreshError(message, cause) {
  return new Error(message, { cause });
}

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post('/auth/refresh')
      .then((response) => {
        const token = extractAccessToken(response);

        if (!token) {
          throw new Error(
            'The refresh endpoint did not return an access token.'
          );
        }

        setAccessToken(token);
        return token;
      })
      .catch((error) => {
        clearAccessToken();

        throw createRefreshError(
          'Your session has expired. Please sign in again.',
          error
        );
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

api.interceptors.request.use(
  (config) => {
    const accessToken = getAccessToken();

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.code === 'ECONNABORTED') {
      error.message =
        'The server took too long to respond. Please try again.';

      return Promise.reject(error);
    }

    if (!error.response) {
      error.message =
        'Unable to connect to the server. Please check your connection.';

      return Promise.reject(error);
    }

    const isUnauthorized = error.response.status === 401;

    const isRefreshRequest =
      originalRequest?.url?.includes('/auth/refresh');

    const isLoginRequest =
      originalRequest?.url?.includes('/auth/login');

    if (
      !isUnauthorized ||
      !originalRequest ||
      originalRequest._retry ||
      isRefreshRequest ||
      isLoginRequest
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const accessToken = await refreshAccessToken();

      originalRequest.headers = originalRequest.headers ?? {};
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;

      return api(originalRequest);
    } catch (refreshError) {
      clearAccessToken();

      return Promise.reject(
        createRefreshError(
          'Authentication failed. Please sign in again.',
          refreshError
        )
      );
    }
  }
);

export default api;