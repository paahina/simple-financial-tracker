import { QueryClient } from '@tanstack/react-query';
import { beginBusy, endBusy } from '../services/api';

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
