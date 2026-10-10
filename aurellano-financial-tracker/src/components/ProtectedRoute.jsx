import { Navigate, Outlet } from 'react-router-dom';
import Button from './Button';
import { useAuth } from '../hooks/useAuth';
import { ErrorText, Loading } from './StatusMessage';

const ProtectedRoute = ({ roles }) => {
  const { user, loading, sessionError, retrySession } = useAuth();

  if (loading) return <Loading variant="session" label="Checking your session" />;
  if (sessionError) {
    return (
      <div className="mx-auto max-w-sm space-y-4 py-16">
        <ErrorText message={sessionError} />
        <Button onClick={retrySession}>Try again</Button>
      </div>
    );
  }
  if (!user) return <Navigate to="/auth/signin" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
};

export default ProtectedRoute;
