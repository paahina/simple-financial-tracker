import { useEffect, useRef } from 'react';
import { useToast } from './useToast';

export const useFormErrorToast = (message) => {
  const { notify } = useToast();
  const seen = useRef('');

  useEffect(() => {
    const text = String(message || '');
    if (!text) {
      seen.current = '';
      return;
    }
    if (text === seen.current) return;
    seen.current = text;
    notify(text, 'error');
  }, [message, notify]);
};
