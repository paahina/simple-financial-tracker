import { X } from 'lucide-react';
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useConfirm } from '../hooks/useConfirm';

const FormModal = ({ dirty, closeTo, wide = false, children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const confirm = useConfirm();
  const background = location.state?.backgroundLocation;
  const destination = background ? `${background.pathname}${background.search || ''}` : closeTo;

  const requestClose = async () => {
    if (dirty) {
      const accepted = await confirm({
        title: 'Discard changes?',
        message: 'Your edits will not be saved.',
        confirmLabel: 'Discard',
        confirmVariant: 'warning',
      });
      if (!accepted) return;
    }
    navigate(destination, { replace: true });
  };

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      if (document.querySelectorAll('[role="dialog"]').length > 1) return;
      requestClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [dirty, destination, confirm, navigate]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-neutral-900/60 px-4 py-10 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <div className={`relative w-full ${wide ? 'max-w-5xl' : 'max-w-lg'}`} role="dialog" aria-modal="true">
        <button
          type="button"
          aria-label="Close"
          className="absolute top-3 right-3 z-10 rounded-md p-1 text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
          onClick={requestClose}
        >
          <X size={16} aria-hidden="true" />
        </button>
        {children}
      </div>
    </div>
  );
};

export default FormModal;
