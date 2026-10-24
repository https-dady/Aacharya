import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import authService from '../services/authService.js';

const AuthContext = createContext(null);

const ACCESS_TOKEN_KEY = 'aacharya_access_token';

function getAuthData(response) {
  return response?.data ?? response;
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const saveAccessToken = useCallback((token) => {
    if (token) {
      sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    }
  }, []);

  const login = useCallback(
    async (credentials) => {
      const response = await authService.login(credentials);
      const data = getAuthData(response);

      if (!data?.accessToken || !data?.user) {
        throw new Error('Invalid authentication response from the server.');
      }

      saveAccessToken(data.accessToken);
      setUser(data.user);

      return data.user;
    },
    [saveAccessToken],
  );

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      saveAccessToken(null);
      setUser(null);
    }
  }, [saveAccessToken]);

  const refreshSession = useCallback(async () => {
    try {
      const response = await authService.refreshToken();
      const data = getAuthData(response);

      if (!data?.accessToken) {
        saveAccessToken(null);
        setUser(null);
        return false;
      }

      saveAccessToken(data.accessToken);

      return true;
    } catch {
      saveAccessToken(null);
      setUser(null);

      return false;
    }
  }, [saveAccessToken]);

  useEffect(() => {
    let active = true;

    async function initializeAuth() {
      try {
        const token = sessionStorage.getItem(ACCESS_TOKEN_KEY);

        if (token) {
          return;
        }

        const response = await authService.refreshToken();
        const data = getAuthData(response);

        if (active && data?.accessToken) {
          saveAccessToken(data.accessToken);
        }
      } catch {
        if (active) {
          saveAccessToken(null);
          setUser(null);
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
  }, [saveAccessToken]);

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

function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }

  return context;
}

export { AuthProvider, useAuth };