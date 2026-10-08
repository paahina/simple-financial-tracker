import { useCallback, useMemo, useState } from 'react';
import { PrivacyContext } from './privacy-context';

const storageKey = 'amountsHidden';

export const PrivacyProvider = ({ children }) => {
  const [amountsHidden, setAmountsHidden] = useState(() => localStorage.getItem(storageKey) === '1');

  const toggleAmountsHidden = useCallback(() => {
    setAmountsHidden((hidden) => {
      const next = !hidden;
      localStorage.setItem(storageKey, next ? '1' : '0');
      return next;
    });
  }, []);

  const value = useMemo(() => ({ amountsHidden, toggleAmountsHidden }), [amountsHidden, toggleAmountsHidden]);

  return <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>;
};
