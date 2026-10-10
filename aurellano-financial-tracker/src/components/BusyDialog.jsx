import { useEffect, useState } from 'react';
import { subscribeBusy } from '../services/api';

const BusyDialog = () => {
  const [count, setCount] = useState(0);

  useEffect(() => subscribeBusy((delta) => setCount((current) => current + delta)), []);

  useEffect(() => {
    if (count <= 0) return undefined;
    const blockKeys = (event) => {
      if (event.key !== 'Enter' && event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
    };
    document.addEventListener('keydown', blockKeys, true);
    return () => document.removeEventListener('keydown', blockKeys, true);
  }, [count]);

  if (count <= 0) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-primary-shade/40 px-4"
      role="alertdialog"
      aria-modal="true"
      aria-busy="true"
      aria-label="Saving"
    >
      <div className="rounded-lg border border-neutral-200 bg-neutral-0 px-6 py-5 text-center text-sm font-medium text-primary-shade shadow-lg">
        <img src="/favicon.svg" alt="" className="icon-wiggle mx-auto h-10 w-10" />
        <p className="mt-3">Saving…</p>
      </div>
    </div>
  );
};

export default BusyDialog;
