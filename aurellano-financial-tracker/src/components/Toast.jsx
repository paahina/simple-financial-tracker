import { useToast } from '../hooks/useToast';

const Toast = () => {
  const { toast } = useToast();
  if (!toast) return null;

  return (
    <div className="fixed right-4 bottom-4 z-50 rounded-md bg-primary-shade px-4 py-3 text-sm text-neutral-0 shadow">
      {toast.message}
    </div>
  );
};

export default Toast;
