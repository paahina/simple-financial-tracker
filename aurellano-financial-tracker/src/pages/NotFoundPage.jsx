import { Link } from 'react-router-dom';

const NotFoundPage = () => (
  <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 text-neutral-900">
    <h1 className="text-2xl font-semibold text-primary-shade">Page not found</h1>
    <Link className="mt-4 text-primary underline" to="/dashboard">
      Go to the dashboard
    </Link>
  </div>
);

export default NotFoundPage;
