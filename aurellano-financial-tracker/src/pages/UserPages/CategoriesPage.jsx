import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CircleOff } from 'lucide-react';
import Button, { EditLink } from '../../components/Button';
import { Empty, ErrorText, Loading } from '../../components/StatusMessage';
import { useAuth } from '../../hooks/useAuth';
import { useConfirm } from '../../hooks/useConfirm';
import { useToast } from '../../hooks/useToast';
import { deactivateCategoryRequest, getCategoriesRequest } from '../../services/api';

const CategoriesPage = () => {
  const { token } = useAuth();
  const location = useLocation();
  const { notify } = useToast();
  const confirm = useConfirm();
  const [categories, setCategories] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(
    () =>
      getCategoriesRequest(token, { includeInactive: true })
        .then(setCategories)
        .catch((err) => setError(err.message)),
    [token],
  );

  useEffect(() => {
    load();
  }, [load]);

  const onDeactivate = async (id) => {
    const accepted = await confirm({
      title: 'Deactivate category?',
      message: 'This category will no longer appear when you record income or expenses.',
      confirmLabel: 'Deactivate',
      confirmVariant: 'warning',
      confirmIcon: CircleOff,
    });
    if (!accepted) return;
    try {
      await deactivateCategoryRequest(id, token);
      notify('Category deactivated');
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-primary-shade">Categories</h1>
        <Link className="rounded-md bg-primary px-4 py-2 text-sm text-neutral-0" to="/categories/new" state={{ backgroundLocation: location }}>
          New category
        </Link>
      </div>
      <ErrorText message={error} />
      {!categories && !error && <Loading variant="list" />}
      {categories?.length === 0 && <Empty label="No categories yet." />}
      <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-neutral-0">
        {categories?.map((category) => (
          <li key={category._id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
            <span>
              {category.name}
              <span className="ml-2 text-neutral-500">
                {category.type}
                {category.isActive ? '' : ' · inactive'}
              </span>
            </span>
            <span className="flex items-center gap-2">
              <EditLink to={`/categories/${category._id}/edit`}>Edit</EditLink>
              {category.isActive && (
                <Button variant="warning" icon={CircleOff} onClick={() => onDeactivate(category._id)}>
                  Deactivate
                </Button>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default CategoriesPage;
