import {
  ArrowLeftRight,
  ChevronDown,
  Eye,
  EyeOff,
  HandCoins,
  LayoutDashboard,
  ShoppingCart,
  LogOut,
  PieChart,
  Receipt,
  Shield,
  Tags,
  Wallet,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
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
  ['/to-buy', 'To-Buy', ShoppingCart],
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
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const items =
    user?.role === 'SYSTEM_ADMIN' ? [...links, ['/admin', 'Admin', Shield]] : links;
  const current = [...items]
    .reverse()
    .find(([to]) => location.pathname === to || location.pathname.startsWith(`${to}/`));

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onPointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) setMenuOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

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
      <div className="flex w-full items-center gap-3 px-4 py-3 lg:gap-4 lg:px-6 lg:py-4">
        <span className="flex shrink-0 items-center gap-2">
          <img src="/favicon.svg" alt="Tracker" className="h-8 w-8 rounded-md" />
          <span className="hidden font-semibold text-primary-shade lg:inline" aria-hidden="true">Tracker</span>
        </span>
        <div className="relative lg:hidden" ref={menuRef}>
          <button
            type="button"
            className="inline-flex max-w-36 items-center gap-1 rounded-md px-3 py-2 text-sm text-neutral-900 hover:bg-neutral-50"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="truncate">{current?.[1] || 'Pages'}</span>
            <ChevronDown size={16} aria-hidden="true" />
          </button>
          {menuOpen && (
            <div className="absolute left-0 top-full z-30 mt-2 w-52 rounded-lg border border-neutral-200 bg-neutral-0 p-2 shadow-sm" role="menu">
              {items.map(([to, label, Icon]) => (
                <NavLink key={to} to={to} className={(state) => `${linkClass(state)} w-full`} role="menuitem" onClick={() => setMenuOpen(false)}>
                  <Icon size={16} aria-hidden="true" />
                  {label}
                </NavLink>
              ))}
            </div>
          )}
        </div>
        <nav className="hidden gap-2 lg:flex lg:flex-nowrap">
          {items.map(([to, label, Icon]) => (
            <NavLink key={to} to={to} className={linkClass}>
              <Icon size={16} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-3 text-sm">
          <span className="hidden text-neutral-500 md:inline">{user?.name}</span>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-neutral-900 hover:text-primary-shade"
            aria-pressed={amountsHidden}
            aria-label={amountsHidden ? 'Show amounts' : 'Hide amounts'}
            onClick={toggleAmountsHidden}
          >
            {amountsHidden ? (
              <EyeOff className="h-6 w-6 lg:h-4 lg:w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-6 w-6 lg:h-4 lg:w-4" aria-hidden="true" />
            )}
            <span className="hidden lg:inline">{amountsHidden ? 'Show amounts' : 'Hide amounts'}</span>
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-destructive hover:text-destructive-shade"
            aria-label="Log out"
            onClick={onLogout}
          >
            <LogOut className="h-6 w-6 lg:h-4 lg:w-4" aria-hidden="true" />
            <span className="hidden lg:inline">Log out</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
