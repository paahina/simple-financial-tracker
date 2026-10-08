export { Loading } from './Skeleton';

export const Empty = ({ label }) => (
  <p className="rounded-md border border-dashed border-neutral-200 bg-neutral-0 px-4 py-6 text-sm text-neutral-500">
    {label}
  </p>
);

export const ErrorText = ({ message }) =>
  message ? <p className="text-sm text-primary-shade">{message}</p> : null;
