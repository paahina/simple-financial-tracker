import { useCallback, useEffect, useMemo, useState } from 'react';
import { loginRequest, logoutRequest, sessionRequest, signupRequest } from '../services/api';
import { AuthContext } from './auth-context';
const TOKEN_KEY = 'tracker_token';
const USER_KEY = 'tracker_user';

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)));

  useEffect(() => {
    if (!token) return undefined;

    let active = true;
    sessionRequest(token)
      .then((data) => {
        if (!active) return;
        setUser(data.user);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      })
      .catch(() => {
        if (!active) return;
        setToken(null);
        setUser(null);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  const saveSession = (nextToken, nextUser) => {
    setToken(nextToken);
    setUser(nextUser);
    localStorage.setItem(TOKEN_KEY, nextToken);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
  };

  const login = useCallback(async (credentials) => {
    const data = await loginRequest(credentials);
    saveSession(data.token, data.user);
  }, []);

  const signup = useCallback(async (payload) => {
    const data = await signupRequest(payload);
    saveSession(data.token, data.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      if (token) await logoutRequest(token);
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  }, [token]);

  const value = useMemo(
    () => ({ token, user, loading, login, signup, logout }),
    [token, user, loading, login, signup, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

