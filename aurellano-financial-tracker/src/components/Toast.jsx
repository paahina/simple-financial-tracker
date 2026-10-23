import { CircleAlert, CircleCheck } from 'lucide-react';
import { useToast } from '../hooks/useToast';

const styles = {
  success: 'bg-primary-shade text-neutral-0',
  error: 'bg-destructive text-neutral-0',
};

const Toast = () => {
  const { toast } = useToast();
  if (!toast) return null;
  const type = toast.type === 'error' ? 'error' : 'success';
  const Icon = type === 'error' ? CircleAlert : CircleCheck;

  return (
    <div
      className={`fixed right-4 bottom-4 z-50 flex max-w-sm items-start gap-2 rounded-md px-4 py-3 text-sm shadow-lg ${styles[type]}`}
      role={type === 'error' ? 'alert' : 'status'}
    >
      <Icon className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
      <span>{toast.message}</span>
    </div>
  );
};

export default Toast;
