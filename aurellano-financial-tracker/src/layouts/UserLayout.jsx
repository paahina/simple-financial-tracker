import { matchPath, Outlet, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import AccountsPage from '../pages/UserPages/AccountsPage';
import CategoriesPage from '../pages/UserPages/CategoriesPage';
import DebtDetailPage from '../pages/UserPages/DebtDetailPage';
import DebtsPage from '../pages/UserPages/DebtsPage';
import TransactionsPage from '../pages/UserPages/TransactionsPage';
import TransfersPage from '../pages/UserPages/TransfersPage';

const backgroundFor = (pathname, state) => {
  const from = state?.backgroundLocation?.pathname || '';
  if (matchPath('/accounts/new', pathname) || matchPath('/accounts/:id/edit', pathname)) return AccountsPage;
  if (matchPath('/categories/new', pathname) || matchPath('/categories/:id/edit', pathname)) return CategoriesPage;
  if (matchPath('/transactions/:id/edit', pathname)) return TransactionsPage;
  if (matchPath('/transfers/:id/edit', pathname)) return TransfersPage;
  if (matchPath('/debts/new', pathname)) return DebtsPage;
  if (
    matchPath('/debts/:id/additions/new', pathname) ||
    matchPath('/debts/:id/additions/:additionId/edit', pathname) ||
    matchPath('/debts/:id/payments/new', pathname) ||
    matchPath('/debts/:id/payments/:paymentId/edit', pathname)
  ) {
    return DebtDetailPage;
  }
  if (matchPath('/debts/:id/edit', pathname)) {
    if (matchPath({ path: '/debts/:id', end: true }, from)) return DebtDetailPage;
    return DebtsPage;
  }
  return null;
};

const UserLayout = () => {
  const location = useLocation();
  const Background = backgroundFor(location.pathname, location.state);

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 pb-8 pt-20">
        {Background ? <Background /> : <Outlet />}
      </main>
      {Background ? <Outlet /> : null}
    </div>
  );
};

export default UserLayout;
