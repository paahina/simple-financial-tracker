import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const links = [
  ['/dashboard', 'Dashboard'],
  ['/accounts', 'Accounts'],
  ['/categories', 'Categories'],
  ['/transactions', 'Transactions'],
  ['/transfers', 'Transfers'],
  ['/debts', 'Debts'],
  ['/reports', 'Reports'],
];

const UserLayout = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <header className="border-b border-neutral-200 bg-neutral-0">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-4">
          <span className="font-semibold text-primary-shade">Tracker</span>
          <nav className="flex flex-wrap gap-2">
            {links.map(([to, label]) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `rounded-md px-3 py-2 text-sm ${
                    isActive ? 'bg-primary text-neutral-0' : 'text-neutral-900 hover:bg-neutral-50'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
            {user?.role === 'SYSTEM_ADMIN' && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `rounded-md px-3 py-2 text-sm ${
                    isActive ? 'bg-primary text-neutral-0' : 'text-neutral-900 hover:bg-neutral-50'
                  }`
                }
              >
                Admin
              </NavLink>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="text-neutral-500">{user?.name}</span>
            <button type="button" className="text-primary-shade underline" onClick={logout}>
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
};

export default UserLayout;
