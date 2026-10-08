import { Pencil } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const styles = {
  primary: 'bg-primary text-neutral-0 hover:bg-primary-shade',
  tint: 'bg-primary-tint text-neutral-0 hover:bg-primary',
  ghost: 'bg-neutral-0 text-neutral-900 border border-neutral-200 hover:bg-neutral-50',
  danger: 'bg-destructive text-neutral-0 hover:bg-destructive-shade',
  warning: 'border border-warning bg-neutral-0 text-warning hover:bg-neutral-50',
};

export const editLinkClass = 'text-edit hover:underline';

export const EditLink = ({ className = '', children, state, ...props }) => {
  const location = useLocation();
  return (
    <Link
      className={`inline-flex items-center gap-1 ${editLinkClass} ${className}`}
      state={{ backgroundLocation: location, ...state }}
      {...props}
    >
      <Pencil size={16} aria-hidden="true" />
      {children}
    </Link>
  );
};

const Button = ({ children, variant = 'primary', className = '', icon: Icon, ...props }) => (
  <button
    type="button"
    className={`inline-flex items-center justify-center gap-1 rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60 ${styles[variant]} ${className}`}
    {...props}
  >
    {Icon ? <Icon size={16} aria-hidden="true" /> : null}
    {children}
  </button>
);

export default Button;
