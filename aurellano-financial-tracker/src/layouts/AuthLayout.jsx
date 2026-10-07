import { Outlet } from 'react-router-dom';

const AuthLayout = () => (
  <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
    <div className="w-full max-w-md rounded-lg border border-neutral-200 bg-neutral-0 p-8 shadow-sm">
      <p className="text-xs tracking-wide text-neutral-500 uppercase">Simple Financial Tracker</p>
      <Outlet />
    </div>
  </div>
);

export default AuthLayout;
