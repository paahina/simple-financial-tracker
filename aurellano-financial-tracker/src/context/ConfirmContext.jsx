import { useCallback, useMemo, useState } from 'react';
import ConfirmDialog from '../components/ConfirmDialog';
import { ConfirmContext } from './confirm-context';

export const ConfirmProvider = ({ children }) => {
  const [request, setRequest] = useState(null);

  const confirm = useCallback(
    (options) =>
      new Promise((resolve) => {
        setRequest({ ...options, resolve });
      }),
    [],
  );

  const close = (accepted) => {
    request?.resolve(accepted);
    setRequest(null);
  };

  const value = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {request && (
        <ConfirmDialog
          title={request.title}
          message={request.message}
          confirmLabel={request.confirmLabel}
          confirmVariant={request.confirmVariant}
          confirmIcon={request.confirmIcon}
          onCancel={() => close(false)}
          onConfirm={() => close(true)}
        />
      )}
    </ConfirmContext.Provider>
  );
};
