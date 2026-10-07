const styles = {
  primary: 'bg-primary text-neutral-0 hover:bg-primary-shade',
  tint: 'bg-primary-tint text-neutral-0 hover:bg-primary',
  ghost: 'bg-neutral-0 text-neutral-900 border border-neutral-200 hover:bg-neutral-50',
};

const Button = ({ children, variant = 'primary', className = '', ...props }) => (
  <button
    type="button"
    className={`rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60 ${styles[variant]} ${className}`}
    {...props}
  >
    {children}
  </button>
);

export default Button;
