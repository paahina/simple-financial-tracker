import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Loading } from './StatusMessage';

const GuestRoute = () => {
  const { user, loading } = useAuth();

  if (loading) return <Loading label="Loading account..." />;
  if (user) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
};

export default GuestRoute;
