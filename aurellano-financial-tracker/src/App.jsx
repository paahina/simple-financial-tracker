import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import GuestRoute from './components/GuestRoute';
import ProtectedRoute from './components/ProtectedRoute';
import Toast from './components/Toast';
import { AuthProvider } from './context/AuthContext';
import { ConfirmProvider } from './context/ConfirmContext';
import { PrivacyProvider } from './context/PrivacyContext';
import { ToastProvider } from './context/ToastContext';
import AdminLayout from './layouts/AdminLayout';
import AuthLayout from './layouts/AuthLayout';
import UserLayout from './layouts/UserLayout';
import OverviewPage from './pages/AdminPages/OverviewPage';
import SignInPage from './pages/AuthPages/SignInPage';
import SignUpPage from './pages/AuthPages/SignUpPage';
import NotFoundPage from './pages/NotFoundPage';
import AccountEditPage from './pages/UserPages/AccountEditPage';
import AccountsPage from './pages/UserPages/AccountsPage';
import CategoriesPage from './pages/UserPages/CategoriesPage';
import CategoryFormPage from './pages/UserPages/CategoryFormPage';
import DashboardPage from './pages/UserPages/DashboardPage';
import DebtDetailPage from './pages/UserPages/DebtDetailPage';
import DebtEditPage from './pages/UserPages/DebtEditPage';
import DebtsPage from './pages/UserPages/DebtsPage';
import PaymentEditPage from './pages/UserPages/PaymentEditPage';
import ReportsPage from './pages/UserPages/ReportsPage';
import TransactionCreatePage from './pages/UserPages/TransactionCreatePage';
import TransactionEditPage from './pages/UserPages/TransactionEditPage';
import TransactionsPage from './pages/UserPages/TransactionsPage';
import TransferCreatePage from './pages/UserPages/TransferCreatePage';
import TransferEditPage from './pages/UserPages/TransferEditPage';
import TransfersPage from './pages/UserPages/TransfersPage';

const router = createBrowserRouter([
  {
    element: <GuestRoute />,
    errorElement: <NotFoundPage />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: '/', element: <Navigate to="/auth/signin" replace /> },
          { path: '/auth/signin', element: <SignInPage /> },
          { path: '/auth/signup', element: <SignUpPage /> },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    errorElement: <NotFoundPage />,
    children: [
      {
        element: <UserLayout />,
        children: [
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/accounts', element: <AccountsPage /> },
          { path: '/accounts/:id/edit', element: <AccountEditPage /> },
          { path: '/categories', element: <CategoriesPage /> },
          { path: '/categories/new', element: <CategoryFormPage /> },
          { path: '/categories/:id/edit', element: <CategoryFormPage /> },
          { path: '/transactions', element: <TransactionsPage /> },
          { path: '/transactions/new', element: <TransactionCreatePage /> },
          { path: '/transactions/:id/edit', element: <TransactionEditPage /> },
          { path: '/transfers', element: <TransfersPage /> },
          { path: '/transfers/new', element: <TransferCreatePage /> },
          { path: '/transfers/:id/edit', element: <TransferEditPage /> },
          { path: '/debts', element: <DebtsPage /> },
          { path: '/debts/:id/edit', element: <DebtEditPage /> },
          { path: '/debts/:id/payments/:paymentId/edit', element: <PaymentEditPage /> },
          { path: '/debts/:id', element: <DebtDetailPage /> },
          { path: '/reports', element: <ReportsPage /> },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute roles={['SYSTEM_ADMIN']} />,
    errorElement: <NotFoundPage />,
    children: [
      {
        path: '/admin',
        element: <AdminLayout />,
        children: [{ index: true, element: <OverviewPage /> }],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);

const App = () => (
  <AuthProvider>
    <ToastProvider>
      <ConfirmProvider>
        <PrivacyProvider>
          <Toast />
          <RouterProvider router={router} />
        </PrivacyProvider>
      </ConfirmProvider>
    </ToastProvider>
  </AuthProvider>
);

export default App;
