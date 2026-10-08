import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';

const DayListDrawer = ({ open, onClose, children }) => {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const close = () => onCloseRef.current();
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      if (document.querySelectorAll('[role="dialog"]').length > 1) return;
      close();
    };
    const media = window.matchMedia('(min-width: 1024px)');
    const onWide = () => {
      if (media.matches) close();
    };
    document.addEventListener('keydown', onKeyDown);
    media.addEventListener('change', onWide);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      media.removeEventListener('change', onWide);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      <button type="button" aria-label="Close days" className="absolute inset-0 bg-neutral-900/60" onClick={onClose} />
      <div
        className="relative flex h-full w-80 max-w-[85%] flex-col bg-neutral-50 p-4 shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-label="Days"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-primary-shade">Days</h2>
          <button
            type="button"
            aria-label="Close"
            className="rounded-md p-1 text-neutral-500 hover:bg-neutral-0 hover:text-neutral-900"
            onClick={onClose}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <div className="overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

export default DayListDrawer;
