import { QueryClient } from '@tanstack/react-query';
import { beginBusy, endBusy } from '../services/api';

export const IDLE_REFRESH_MS = 24 * 60 * 60 * 1000;
export const LAST_HIDDEN_STORAGE_KEY = 'tracker_last_hidden_at';

export const LEDGER_QUERY_FAMILIES = [
  'dashboard',
  'accounts',
  'categories',
  'transactions',
  'transfers',
  'debts',
  'to-buy',
  'reports',
];

export const writeLastHiddenAt = () => {
  localStorage.setItem(LAST_HIDDEN_STORAGE_KEY, String(Date.now()));
};

export const refreshLedgerAfterIdle = () => {
  invalidateFamilies(...LEDGER_QUERY_FAMILIES);
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: 1,
    },
  },
});

export const invalidateFamilies = (...families) => {
  families.forEach((family) => {
    void queryClient.resetQueries({ queryKey: [family] });
  });
};

export const afterSave = async (work) => {
  beginBusy();
  try {
    await work();
  } finally {
    endBusy();
  }
};
