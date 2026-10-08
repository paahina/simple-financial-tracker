import Button from './Button';

const ConfirmDialog = ({
  title,
  message,
  confirmLabel = 'Confirm',
  confirmVariant = 'primary',
  confirmIcon,
  onCancel,
  onConfirm,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary-shade/40 px-4">
    <div className="w-full max-w-md rounded-lg border border-neutral-200 bg-neutral-0 p-5 shadow-lg" role="dialog" aria-modal="true">
      <h2 className="text-lg font-semibold text-primary-shade">{title}</h2>
      <p className="mt-2 text-sm text-neutral-500">{message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant={confirmVariant} icon={confirmIcon} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </div>
  </div>
);

export default ConfirmDialog;
