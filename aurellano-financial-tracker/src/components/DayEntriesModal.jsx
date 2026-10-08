import { X } from 'lucide-react';
import { useEffect } from 'react';
import { Loading } from './StatusMessage';

const DayEntriesModal = ({ title, loading, onClose, children }) => {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      if (document.querySelectorAll('[role="dialog"]').length > 1) return;
      onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-neutral-900/60 px-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-neutral-200 bg-neutral-0 p-5 shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-primary-shade">{title}</h2>
          <button type="button" className="text-neutral-500" aria-label="Close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        {loading ? <Loading variant="list" /> : children}
      </div>
    </div>
  );
};

export default DayEntriesModal;
