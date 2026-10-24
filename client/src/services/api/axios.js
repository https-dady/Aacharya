import axios from 'axios';

const API_BASE_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
).replace(/\/+$/, '');

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 15000,
});

api.interceptors.request.use(
  (config) => {
    const accessToken = sessionStorage.getItem('aacharya_access_token');

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED') {
      error.message = 'The server took too long to respond. Please try again.';
    } else if (!error.response) {
      error.message = 'Unable to connect to the server. Please check your connection.';
    }

    return Promise.reject(error);
  }
);

export default api;