import { useEffect } from 'react';
import {
  IDLE_REFRESH_MS,
  LAST_HIDDEN_STORAGE_KEY,
  refreshLedgerAfterIdle,
  writeLastHiddenAt,
} from '../query/cache';

const idleExceeded = () => {
  const raw = localStorage.getItem(LAST_HIDDEN_STORAGE_KEY);
  if (!raw) return false;
  const hiddenAt = Number(raw);
  if (!Number.isFinite(hiddenAt)) return false;
  return Date.now() - hiddenAt >= IDLE_REFRESH_MS;
};

const refreshIfIdleExceeded = () => {
  if (!idleExceeded()) return;
  refreshLedgerAfterIdle();
};

export const useRefreshLedgerAfterIdle = () => {
  useEffect(() => {
    refreshIfIdleExceeded();

    const onHidden = () => writeLastHiddenAt();
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        writeLastHiddenAt();
        return;
      }
      refreshIfIdleExceeded();
    };

    window.addEventListener('pagehide', onHidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', onHidden);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);
};
