const API_BASE_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
).replace(/\/+$/, '');

const ACCESS_TOKEN_KEY = 'aacharya_access_token';
const REQUEST_TIMEOUT_MS = 15000;
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

function notifyAuthenticationExpired() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('aacharya:auth-expired'));
  }
}

async function parseResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await response.json()
    : (await response.text()) || null;

  if (!response.ok) {
    const message =
      data?.message ||
      data?.error?.message ||
      `Request failed with status ${response.status}.`;
    const error = new Error(message);
    error.response = { status: response.status, data };
    error.status = response.status;
    throw error;
  }

  return { data, status: response.status, headers: response.headers };
}

async function performRequest(path, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const headers = new Headers(options.headers || {});
  headers.set('Accept', 'application/json');

  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  const token = getAccessToken();
  if (token && !options.skipAuthorization) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  try {
    const requestOptions = { ...options };
    delete requestOptions.skipAuthorization;
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...requestOptions,
      headers,
      credentials: 'include',
      signal: controller.signal,
    });
    return await parseResponse(response);
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(
        'The server took too long to respond. Please try again.',
        { cause: error },
      );
    }

    if (!error?.response) {
      throw new Error(
        'Unable to connect to the server. Please check your connection.',
        { cause: error },
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = performRequest('/v1/auth/refresh', {
      method: 'POST',
      skipAuthorization: true,
    })
      .then((response) => {
        const body = response?.data;
        const tokenData = body?.data ?? body;
        const token = tokenData?.accessToken ?? tokenData?.token;

        if (typeof token !== 'string' || !token.trim()) {
          throw new Error('The refresh endpoint did not return an access token.');
        }

        setAccessToken(token);
        return token;
      })
      .catch((error) => {
        setAccessToken(null);
        notifyAuthenticationExpired();
        throw new Error(
          'Your session has expired. Please sign in again.',
          { cause: error },
        );
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

async function post(path, body) {
  const options = {
    method: 'POST',
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  };

  try {
    return await performRequest(path, options);
  } catch (error) {
    const isUnauthorized = error?.response?.status === 401;
    const isAuthEntryPoint = /\/v1\/auth\/(login|refresh)$/.test(path);

    if (!isUnauthorized || isAuthEntryPoint) {
      throw error;
    }

    try {
      const token = await refreshAccessToken();
      return await performRequest(path, {
        ...options,
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (refreshError) {
      setAccessToken(null);
      notifyAuthenticationExpired();
      throw new Error(
        'Authentication failed. Please sign in again.',
        { cause: refreshError },
      );
    }
  }
}

const api = { post };

export { getAccessToken, setAccessToken };
export default api;
