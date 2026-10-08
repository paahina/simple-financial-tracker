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
      <ul className="space-y-3 lg:space-y-0 lg:divide-y lg:divide-neutral-200 lg:overflow-hidden lg:rounded-lg lg:border lg:border-neutral-200 lg:bg-neutral-0">
        {categories?.map((category) => (
          <li key={category._id} className="rounded-lg border border-neutral-200 bg-neutral-0 p-4 text-sm lg:flex lg:items-center lg:justify-between lg:gap-3 lg:rounded-none lg:border-0 lg:px-4 lg:py-3">
            <div className="min-w-0">
              <div className="flex items-start justify-between gap-3 lg:block">
                <span>
                  {category.name}
                  <span className="ml-2 hidden text-neutral-500 lg:inline">
                    {category.type}
                    {category.isActive ? '' : ' · inactive'}
                  </span>
                  {!category.isActive && <span className="mt-1 block text-neutral-500 lg:hidden">Inactive</span>}
                </span>
                <span className="shrink-0 text-neutral-500 lg:hidden">{category.type}</span>
              </div>
            </div>
            <span className="mt-3 flex flex-wrap items-center gap-2 lg:mt-0">
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
