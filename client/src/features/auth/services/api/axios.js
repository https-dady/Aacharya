const API_BASE_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
).replace(/\/+$/, '');

const ACCESS_TOKEN_KEY = 'aacharya_access_token';
const REQUEST_TIMEOUT_MS = 15000;

let refreshPromise = null;

const inFlightGetRequests = new Map();

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

function isFormData(body) {
  return (
    typeof FormData !== 'undefined' &&
    body instanceof FormData
  );
}

function serializeRequestBody(body) {
  if (body === undefined || isFormData(body)) {
    return body;
  }

  return JSON.stringify(body);
}

function buildRequestUrl(path, params) {
  const url = new URL(`${API_BASE_URL}${path}`);

  if (params && typeof params === 'object') {
    Object.entries(params).forEach(([key, value]) => {
      if (
        value === undefined ||
        value === null ||
        value === ''
      ) {
        return;
      }

      if (Array.isArray(value)) {
        value.forEach((item) => {
          url.searchParams.append(key, String(item));
        });

        return;
      }

      url.searchParams.set(key, String(value));
    });
  }

  return url.toString();
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

    error.response = {
      status: response.status,
      data,
    };

    error.status = response.status;

    throw error;
  }

  return {
    data,
    status: response.status,
    headers: response.headers,
  };
}

async function performRequest(path, options = {}) {
  const controller = new AbortController();
  const externalSignal = options.signal;

  let timedOut = false;

  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  const abortFromExternalSignal = () => {
    controller.abort(externalSignal?.reason);
  };

  if (externalSignal?.aborted) {
    abortFromExternalSignal();
  } else {
    externalSignal?.addEventListener(
      'abort',
      abortFromExternalSignal,
      { once: true },
    );
  }

  const headers = new Headers(options.headers || {});

  headers.set('Accept', 'application/json');

  /*
   * Let the browser generate the multipart boundary for FormData.
   * Setting application/json for FormData breaks file uploads.
   */
  if (isFormData(options.body)) {
    headers.delete('Content-Type');
  } else if (
    options.body !== undefined &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }

  const token = getAccessToken();

  if (token && !options.skipAuthorization) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  try {
    const requestOptions = { ...options };

    delete requestOptions.skipAuthorization;
    delete requestOptions.params;

    const response = await fetch(
      buildRequestUrl(path, options.params),
      {
        ...requestOptions,
        headers,
        credentials: 'include',
        signal: controller.signal,
      },
    );

    return await parseResponse(response);
  } catch (error) {
    if (externalSignal?.aborted) {
      const cancellationError = new Error('Request canceled.');

      cancellationError.code = 'ERR_CANCELED';

      throw cancellationError;
    }

    if (timedOut || error?.name === 'AbortError') {
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

    externalSignal?.removeEventListener(
      'abort',
      abortFromExternalSignal,
    );
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

        const token =
          tokenData?.accessToken ??
          tokenData?.token;

        if (typeof token !== 'string' || !token.trim()) {
          throw new Error(
            'The refresh endpoint did not return an access token.',
          );
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

function isAuthEntryPoint(path) {
  return /\/v1\/auth\/(?:login|refresh|password\/reset\/(?:request|verify|confirm)|student\/activation\/confirm)$/
    .test(path);
}

async function requestWithRefresh(path, options = {}) {
  try {
    return await performRequest(path, options);
  } catch (error) {
    if (error?.code === 'ERR_CANCELED') {
      throw error;
    }

    const isUnauthorized = error?.response?.status === 401;

    if (
      !isUnauthorized ||
      isAuthEntryPoint(path) ||
      options.skipAuthorization
    ) {
      throw error;
    }

    try {
      await refreshAccessToken();

      if (options.signal?.aborted) {
        const cancellationError = new Error('Request canceled.');

        cancellationError.code = 'ERR_CANCELED';

        throw cancellationError;
      }

      return await performRequest(path, options);
    } catch (refreshError) {
      if (refreshError?.code === 'ERR_CANCELED') {
        throw refreshError;
      }

      setAccessToken(null);
      notifyAuthenticationExpired();

      throw new Error(
        'Authentication failed. Please sign in again.',
        { cause: refreshError },
      );
    }
  }
}

function createGetRequestKey(path, options) {
  const url = buildRequestUrl(path, options.params);
  const token = getAccessToken() || '';

  const headers = Array.from(
    new Headers(options.headers || {}).entries(),
  ).sort(([keyA], [keyB]) => keyA.localeCompare(keyB));

  return JSON.stringify({
    url,
    token,
    headers,
    skipAuthorization: Boolean(options.skipAuthorization),
  });
}

async function get(path, options = {}) {
  // Requests with an external AbortSignal must remain independent.
  if (options.signal) {
    return requestWithRefresh(path, {
      ...options,
      method: 'GET',
    });
  }

  const requestKey = createGetRequestKey(path, options);
  const existingRequest = inFlightGetRequests.get(requestKey);

  if (existingRequest) {
    return existingRequest;
  }

  const requestPromise = requestWithRefresh(path, {
    ...options,
    method: 'GET',
  });

  inFlightGetRequests.set(requestKey, requestPromise);

  try {
    return await requestPromise;
  } finally {
    if (inFlightGetRequests.get(requestKey) === requestPromise) {
      inFlightGetRequests.delete(requestKey);
    }
  }
}

async function post(path, body, options = {}) {
  return requestWithRefresh(path, {
    ...options,
    method: 'POST',
    ...(body === undefined
      ? {}
      : { body: serializeRequestBody(body) }),
  });
}

async function patch(path, body, options = {}) {
  return requestWithRefresh(path, {
    ...options,
    method: 'PATCH',
    ...(body === undefined
      ? {}
      : { body: serializeRequestBody(body) }),
  });
}

async function del(path, options = {}) {
  return requestWithRefresh(path, {
    ...options,
    method: 'DELETE',
  });
}

const api = {
  get,
  post,
  patch,
  delete: del,
};

export {
  getAccessToken,
  setAccessToken,
};

export default api;