import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError, loginRequest, logoutRequest, sessionRequest, signupRequest } from '../services/api';
import { AuthContext } from './auth-context';

const TOKEN_KEY = 'tracker_token';
const USER_KEY = 'tracker_user';
const SESSION_TIMEOUT_MS = 30000;
const SESSION_RETRY_LIMIT = 3;
const SESSION_RETRY_DELAYS_MS = [2000, 4000];

const sleep = (ms, signal) =>
  new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timeoutId = window.setTimeout(resolve, ms);
    const onAbort = () => {
      window.clearTimeout(timeoutId);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal.addEventListener('abort', onAbort, { once: true });
  });

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
    const effectController = new AbortController();

    const restoreSession = async () => {
      let lastError;

      for (let attempt = 0; attempt < SESSION_RETRY_LIMIT; attempt += 1) {
        if (requestId.current !== id || effectController.signal.aborted) return;

        const attemptController = new AbortController();
        const abortAttempt = () => attemptController.abort();
        effectController.signal.addEventListener('abort', abortAttempt);
        const timeoutId = window.setTimeout(abortAttempt, SESSION_TIMEOUT_MS);

        try {
          const data = await sessionRequest(token, { signal: attemptController.signal });
          if (requestId.current !== id) return;
          setUser(data.user);
          setSessionError('');
          localStorage.setItem(USER_KEY, JSON.stringify(data.user));
          setLoading(false);
          return;
        } catch (err) {
          if (requestId.current !== id || effectController.signal.aborted) return;
          if (err instanceof ApiError && err.status === 401) {
            clearStoredSession();
            setLoading(false);
            return;
          }
          if (err instanceof ApiError) {
            setSessionError(err.message || 'Could not reach the server. Try again.');
            setLoading(false);
            return;
          }
          lastError = err;
        } finally {
          window.clearTimeout(timeoutId);
          effectController.signal.removeEventListener('abort', abortAttempt);
        }

        if (attempt < SESSION_RETRY_LIMIT - 1) {
          try {
            await sleep(SESSION_RETRY_DELAYS_MS[attempt] ?? 2000, effectController.signal);
          } catch {
            return;
          }
        }
      }

      if (requestId.current !== id || effectController.signal.aborted) return;
      if (lastError?.name === 'AbortError') {
        setSessionError('The server took too long to respond. Try again.');
      } else {
        setSessionError(lastError?.message || 'Could not reach the server. Try again.');
      }
      setLoading(false);
    };

    restoreSession();

    return () => {
      requestId.current += 1;
      effectController.abort();
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
