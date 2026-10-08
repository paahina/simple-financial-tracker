import {
  ArrowLeftRight,
  Eye,
  EyeOff,
  HandCoins,
  LayoutDashboard,
  LogOut,
  PieChart,
  Receipt,
  Shield,
  Tags,
  Wallet,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useConfirm } from '../hooks/useConfirm';
import { usePrivacy } from '../hooks/usePrivacy';

const links = [
  ['/dashboard', 'Dashboard', LayoutDashboard],
  ['/accounts', 'Accounts', Wallet],
  ['/categories', 'Categories', Tags],
  ['/transactions', 'Transactions', Receipt],
  ['/transfers', 'Transfers', ArrowLeftRight],
  ['/debts', 'Debts', HandCoins],
  ['/reports', 'Reports', PieChart],
];

const linkClass = ({ isActive }) =>
  `inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm ${
    isActive ? 'bg-primary text-neutral-0' : 'text-neutral-900 hover:bg-neutral-50'
  }`;

const Navbar = () => {
  const { user, logout } = useAuth();
  const confirm = useConfirm();
  const { amountsHidden, toggleAmountsHidden } = usePrivacy();

  const onLogout = async () => {
    const accepted = await confirm({
      title: 'Log out?',
      message: 'You will need to sign in again to see your accounts.',
      confirmLabel: 'Log out',
      confirmVariant: 'danger',
      confirmIcon: LogOut,
    });
    if (accepted) logout();
  };

  return (
    <header className="fixed inset-x-0 top-0 z-30 border-b border-neutral-200 bg-neutral-0">
      <div className="flex w-full flex-wrap items-center gap-4 px-6 py-4 lg:flex-nowrap">
        <span className="shrink-0 font-semibold text-primary-shade">Tracker</span>
        <nav className="flex flex-wrap gap-2 lg:flex-nowrap">
          {links.map(([to, label, Icon]) => (
            <NavLink key={to} to={to} className={linkClass}>
              <Icon size={16} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
          {user?.role === 'SYSTEM_ADMIN' && (
            <NavLink to="/admin" className={linkClass}>
              <Shield size={16} aria-hidden="true" />
              Admin
            </NavLink>
          )}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-3 text-sm">
          <span className="text-neutral-500">{user?.name}</span>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-neutral-900 hover:text-primary-shade"
            aria-pressed={amountsHidden}
            aria-label={amountsHidden ? 'Show amounts' : 'Hide amounts'}
            onClick={toggleAmountsHidden}
          >
            {amountsHidden ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
            {amountsHidden ? 'Show amounts' : 'Hide amounts'}
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-destructive hover:text-destructive-shade"
            onClick={onLogout}
          >
            <LogOut size={16} aria-hidden="true" />
            Log out
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
