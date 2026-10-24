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

let initializationPromise = null;

function getAuthData(response) {
  return response?.data ?? response;
}

function saveAccessToken(token) {
  if (token) {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
    return;
  }

  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const login = useCallback(async (credentials) => {
    const response = await authService.login(credentials);
    const data = getAuthData(response);

    if (!data?.accessToken || !data?.user) {
      throw new Error(
        'Invalid authentication response from the server.',
      );
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
    throw new Error(
      'useAuth must be used within an AuthProvider.',
    );
  }

  return context;
}

export { AuthProvider, useAuth };