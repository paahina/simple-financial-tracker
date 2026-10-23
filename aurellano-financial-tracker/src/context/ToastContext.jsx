import { useCallback, useMemo, useRef, useState } from 'react';
import { ToastContext } from './toast-context';

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState(null);
  const timer = useRef(0);

  const notify = useCallback((message, type = 'success') => {
    window.clearTimeout(timer.current);
    setToast({ message, type });
    timer.current = window.setTimeout(() => setToast(null), type === 'error' ? 5000 : 3000);
  }, []);

  const value = useMemo(() => ({ toast, notify }), [toast, notify]);

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
};
