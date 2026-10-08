const Field = ({ label, error, children }) => (
  <label className="block text-sm text-neutral-900">
    <span className="mb-1 block text-neutral-500">{label}</span>
    {children}
    {error && <span className="mt-1 block text-xs text-error-foreground">{error}</span>}
  </label>
);

export const inputClass =
  'w-full rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-neutral-900 outline-none focus:border-primary';

export default Field;
