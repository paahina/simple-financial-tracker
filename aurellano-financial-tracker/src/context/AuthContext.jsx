import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError, loginRequest, logoutRequest, sessionRequest, signupRequest } from '../services/api';
import { AuthContext } from './auth-context';

const TOKEN_KEY = 'tracker_token';
const USER_KEY = 'tracker_user';
const SESSION_TIMEOUT_MS = 20000;

const readStoredUser = () => {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(readStoredUser);
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)));
  const [sessionError, setSessionError] = useState('');
  const [sessionAttempt, setSessionAttempt] = useState(0);
  const requestId = useRef(0);

  const clearStoredSession = useCallback(() => {
    setToken(null);
    setUser(null);
    setSessionError('');
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }, []);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return undefined;
    }

    const id = requestId.current + 1;
    requestId.current = id;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), SESSION_TIMEOUT_MS);

    sessionRequest(token, { signal: controller.signal })
      .then((data) => {
        if (requestId.current !== id) return;
        setUser(data.user);
        setSessionError('');
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      })
      .catch((err) => {
        if (requestId.current !== id) return;
        if (err instanceof ApiError && err.status === 401) {
          clearStoredSession();
          return;
        }
        if (err?.name === 'AbortError') {
          setSessionError('The server took too long to respond. Try again.');
          return;
        }
        setSessionError(err?.message || 'Could not reach the server. Try again.');
      })
      .finally(() => {
        window.clearTimeout(timeoutId);
        if (requestId.current === id) setLoading(false);
      });

    return () => {
      requestId.current += 1;
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [token, sessionAttempt, clearStoredSession]);

  const saveSession = (nextToken, nextUser) => {
    setSessionError('');
    setToken(nextToken);
    setUser(nextUser);
    localStorage.setItem(TOKEN_KEY, nextToken);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setLoading(false);
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
      clearStoredSession();
      setLoading(false);
    }
  }, [token, clearStoredSession]);

  const retrySession = useCallback(() => {
    setSessionError('');
    setLoading(true);
    setSessionAttempt((attempt) => attempt + 1);
  }, []);

  const value = useMemo(
    () => ({ token, user, loading, sessionError, login, signup, logout, retrySession }),
    [token, user, loading, sessionError, login, signup, logout, retrySession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
