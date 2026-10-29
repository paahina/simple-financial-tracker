import { matchPath, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useRefreshLedgerAfterIdle } from '../hooks/useRefreshLedgerAfterIdle';
import AccountsPage from '../pages/UserPages/AccountsPage';
import CategoriesPage from '../pages/UserPages/CategoriesPage';
import DebtDetailPage from '../pages/UserPages/DebtDetailPage';
import DebtsPage from '../pages/UserPages/DebtsPage';
import TransactionsPage from '../pages/UserPages/TransactionsPage';
import ToBuyPage from '../pages/UserPages/ToBuyPage';
import TransfersPage from '../pages/UserPages/TransfersPage';

const asLocation = (pathname, search = '') => ({
  pathname,
  search,
  hash: '',
  state: null,
  key: 'background',
});

const fallbackBackground = (pathname) => {
  if (matchPath('/accounts/new', pathname) || matchPath('/accounts/:id/edit', pathname)) {
    return asLocation('/accounts');
  }
  if (matchPath('/categories/new', pathname) || matchPath('/categories/:id/edit', pathname)) {
    return asLocation('/categories');
  }
  if (matchPath('/transactions/new', pathname) || matchPath('/transactions/:id/edit', pathname)) {
    return asLocation('/transactions');
  }
  if (matchPath('/transfers/new', pathname) || matchPath('/transfers/:id/edit', pathname)) {
    return asLocation('/transfers');
  }
  if (matchPath('/debts/new', pathname) || matchPath('/debts/:id/edit', pathname)) {
    return asLocation('/debts');
  }
  if (
    matchPath('/to-buy/new', pathname) ||
    matchPath('/to-buy/:id/edit', pathname) ||
    matchPath('/to-buy/:id/done', pathname)
  ) {
    return asLocation('/to-buy');
  }
  const addition =
    matchPath('/debts/:id/additions/new', pathname) ||
    matchPath('/debts/:id/additions/:additionId/edit', pathname) ||
    matchPath('/debts/:id/balances/add', pathname);
  if (addition) return asLocation(`/debts/${addition.params.id}`, '?tab=additions');
  const payment =
    matchPath('/debts/:id/payments/new', pathname) ||
    matchPath('/debts/:id/payments/:paymentId/edit', pathname);
  if (payment) return asLocation(`/debts/${payment.params.id}`, '?tab=payments');
  return null;
};

const overlayBackground = (pathname, state) => {
  const from = state?.backgroundLocation;
  if (from?.pathname) {
    return {
      pathname: from.pathname,
      search: from.search || '',
      hash: from.hash || '',
      state: from.state ?? null,
      key: from.key || 'background',
    };
  }
  return fallbackBackground(pathname);
};

const UserLayout = () => {
  const location = useLocation();
  const background = overlayBackground(location.pathname, location.state);
  useRefreshLedgerAfterIdle();

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 pb-8 pt-20">
        {background ? (
          <Routes location={background}>
            <Route path="/accounts" element={<AccountsPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/transfers" element={<TransfersPage />} />
            <Route path="/debts/:id" element={<DebtDetailPage />} />
            <Route path="/debts" element={<DebtsPage />} />
            <Route path="/to-buy" element={<ToBuyPage />} />
          </Routes>
        ) : (
          <Outlet />
        )}
      </main>
      {background ? <Outlet /> : null}
    </div>
  );
};

export default UserLayout;
