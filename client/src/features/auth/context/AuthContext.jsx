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

function saveAccessToken(token) {
  if (token) {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
  } else {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  }
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const login = useCallback(async (credentials) => {
    const response = await authService.login(credentials);
    const data = getAuthData(response);

    if (!data?.accessToken || !data?.user) {
      throw new Error('Invalid authentication response from the server.');
    }

    saveAccessToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      saveAccessToken(null);
      setUser(null);
    }
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const response = await authService.refreshToken();
      const data = getAuthData(response);

      if (!data?.accessToken || !data?.user) {
        saveAccessToken(null);
        setUser(null);
        return false;
      }

      saveAccessToken(data.accessToken);
      setUser(data.user);
      return true;
    } catch {
      saveAccessToken(null);
      setUser(null);
      return false;
    }
  }, []);

  useEffect(() => {
    const handleAuthenticationExpired = () => {
      saveAccessToken(null);
      setUser(null);
      setLoading(false);
    };

    window.addEventListener('aacharya:auth-expired', handleAuthenticationExpired);
    return () => {
      window.removeEventListener('aacharya:auth-expired', handleAuthenticationExpired);
    };
  }, []);

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
        if (!active) return;

        if (data?.accessToken && data?.user) {
          saveAccessToken(data.accessToken);
          setUser(data.user);
        } else {
          saveAccessToken(null);
          setUser(null);
        }
      } catch {
        if (active) {
          saveAccessToken(null);
          setUser(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    initializeAuth();
    return () => { active = false; };
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      login,
      logout,
      refreshSession,
      setUser,
    }),
    [user, loading, login, logout, refreshSession],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export { AuthProvider };
