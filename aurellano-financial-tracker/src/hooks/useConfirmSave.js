import { useConfirm } from './useConfirm';

export const useConfirmSave = () => {
  const confirm = useConfirm();
  return (options = {}) =>
    confirm({
      title: options.title ?? 'Save changes?',
      message: options.message ?? 'This will update your records.',
      confirmLabel: options.confirmLabel ?? 'Save',
      confirmVariant: 'primary',
    });
};
