import { useMemo, useState } from 'react';
import { ToastContext } from './toast-context';

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState(null);

  const notify = (message, type = 'success') => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3000);
  };

  const value = useMemo(() => ({ toast, notify }), [toast]);

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
};

