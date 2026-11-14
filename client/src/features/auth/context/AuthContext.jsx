import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import AuthContext from './auth-context.js';
import authService from '../services/authService.js';

const ACCESS_TOKEN_KEY = 'aacharya_access_token';

let initializationPromise = null;

function getAuthData(response) {
  return response?.data?.data ?? response?.data ?? response;
}

function normalizeRole(role) {
  return typeof role === 'string'
    ? role.trim().toUpperCase()
    : '';
}

function normalizeUser(user) {
  if (!user || typeof user !== 'object') {
    return null;
  }

  const primaryRole = normalizeRole(user.role);

  const additionalRoles = Array.isArray(user.roles)
    ? user.roles.map(normalizeRole).filter(Boolean)
    : [];

  const roles = new Set([
    ...(primaryRole ? [primaryRole] : []),
    ...additionalRoles,
  ]);

  /*
   * Faculty is the shared teaching capability.
   *
   * Keep compatibility with existing Mentor and HOD accounts
   * while the backend role reconciliation is completed.
   */
  if (
    roles.has('MENTOR')
    || roles.has('HOD')
  ) {
    roles.add('FACULTY');
  }

  return {
    ...user,
    role: primaryRole,
    roles: [...roles],
  };
}

function saveAccessToken(token) {
  if (
    typeof token === 'string'
    && token.trim()
  ) {
    sessionStorage.setItem(
      ACCESS_TOKEN_KEY,
      token,
    );
  } else {
    sessionStorage.removeItem(
      ACCESS_TOKEN_KEY,
    );
  }
}

function AuthProvider({ children }) {
  const [user, setUserState] = useState(null);
  const [loading, setLoading] = useState(true);

  const setUser = useCallback((nextUser) => {
    setUserState(normalizeUser(nextUser));
  }, []);

  const login = useCallback(async (credentials) => {
    const response = await authService.login(credentials);

    const data = getAuthData(response);

    if (
      !data?.accessToken
      || !data?.user
    ) {
      throw new Error(
        'Invalid authentication response from the server.',
      );
    }

    const normalizedUser = normalizeUser(data.user);

    if (!normalizedUser?.role) {
      throw new Error(
        'The authentication response does not contain a valid user role.',
      );
    }

    saveAccessToken(data.accessToken);

    setUserState(normalizedUser);

    return normalizedUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      saveAccessToken(null);
      setUserState(null);
    }
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const response = await authService.refreshToken();

      const data = getAuthData(response);

      if (
        !data?.accessToken
        || !data?.user
      ) {
        saveAccessToken(null);
        setUserState(null);

        return false;
      }

      const normalizedUser = normalizeUser(data.user);

      if (!normalizedUser?.role) {
        saveAccessToken(null);
        setUserState(null);

        return false;
      }

      saveAccessToken(data.accessToken);

      setUserState(normalizedUser);

      return true;
    } catch {
      saveAccessToken(null);
      setUserState(null);

      return false;
    }
  }, []);

  const hasRole = useCallback((...allowedRoles) => {
    if (!user) {
      return false;
    }

    const currentRoles = new Set(
      [
        user.role,
        ...(Array.isArray(user.roles) ? user.roles : []),
      ].map(normalizeRole).filter(Boolean),
    );

    return allowedRoles
      .map(normalizeRole)
      .filter(Boolean)
      .some((role) => currentRoles.has(role));
  }, [user]);

  /*
   * Clear the local authentication state when the API client
   * reports an expired or invalid session.
   */
  useEffect(() => {
    const handleAuthenticationExpired = () => {
      saveAccessToken(null);
      setUserState(null);
      setLoading(false);
    };

    window.addEventListener(
      'aacharya:auth-expired',
      handleAuthenticationExpired,
    );

    return () => {
      window.removeEventListener(
        'aacharya:auth-expired',
        handleAuthenticationExpired,
      );
    };
  }, []);

  /*
   * Restore the existing session during application startup.
   *
   * The shared promise prevents duplicate refresh requests
   * when multiple components initialize simultaneously.
   */
  useEffect(() => {
    let active = true;

    async function initializeAuth() {
      try {
        if (!initializationPromise) {
          initializationPromise = authService
            .refreshToken()
            .then((response) => getAuthData(response))
            .finally(() => {
              initializationPromise = null;
            });
        }

        const data = await initializationPromise;

        if (!active) {
          return;
        }

        if (
          data?.accessToken
          && data?.user
        ) {
          const normalizedUser = normalizeUser(data.user);

          if (normalizedUser?.role) {
            saveAccessToken(data.accessToken);
            setUserState(normalizedUser);
          } else {
            saveAccessToken(null);
            setUserState(null);
          }
        } else {
          saveAccessToken(null);
          setUserState(null);
        }
      } catch {
        if (active) {
          saveAccessToken(null);
          setUserState(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    initializeAuth();

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,

      isAuthenticated: Boolean(user),

      hasRole,

      login,
      logout,
      refreshSession,
      setUser,
    }),
    [
      user,
      loading,
      hasRole,
      login,
      logout,
      refreshSession,
      setUser,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export { AuthProvider };