import { Link, Outlet } from 'react-router-dom';

const AdminLayout = () => (
  <div className="flex min-h-screen bg-neutral-50">
    <aside className="w-56 border-r border-neutral-200 bg-primary-shade p-4 text-neutral-0">
      <p className="mb-6 text-sm font-semibold">Admin</p>
      <Link to="/admin" className="block rounded-md bg-primary px-3 py-2 text-sm">
        Overview
      </Link>
      <Link to="/dashboard" className="mt-2 block px-3 py-2 text-sm text-neutral-200">
        Back to tracker
      </Link>
    </aside>
    <div className="flex-1">
      <header className="border-b border-neutral-200 bg-neutral-0 px-6 py-4 text-sm text-neutral-500">
        Administration
      </header>
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  </div>
);

export default AdminLayout;
