const Field = ({ label, children }) => (
  <label className="block text-sm text-neutral-900">
    <span className="mb-1 block text-neutral-500">{label}</span>
    {children}
  </label>
);

export const inputClass =
  'w-full rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-neutral-900 outline-none focus:border-primary';

export default Field;
