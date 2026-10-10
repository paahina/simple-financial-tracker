import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CircleOff } from 'lucide-react';
import Button, { EditLink } from '../../components/Button';
import Pager from '../../components/Pager';
import { Empty, ErrorText, Loading } from '../../components/StatusMessage';
import { useAuth } from '../../hooks/useAuth';
import { useConfirm } from '../../hooks/useConfirm';
import { useToast } from '../../hooks/useToast';
import { invalidateFamilies } from '../../query/cache';
import { deactivateCategoryRequest, getCategoriesRequest } from '../../services/api';

const CategoriesPage = () => {
  const { token } = useAuth();
  const location = useLocation();
  const { notify } = useToast();
  const confirm = useConfirm();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [actionError, setActionError] = useState('');
  const categoriesQuery = useQuery({
    queryKey: ['categories', 'page', { page, pageSize, includeInactive: true }],
    queryFn: () => getCategoriesRequest(token, { includeInactive: true, page: page + 1, limit: pageSize }),
    enabled: Boolean(token),
  });
  const categories = categoriesQuery.data?.data ?? null;
  const total = categoriesQuery.data?.total ?? 0;
  const error = actionError || categoriesQuery.error?.message || '';

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
      await invalidateFamilies('categories');
      if (categories.length === 1 && page > 0) setPage((current) => current - 1);
    } catch (err) {
      setActionError(err.message);
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
      {!categories && !error && <Loading variant="cards" />}
      {categories?.length === 0 && <Empty label="No categories yet." />}
      <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {categories?.map((category) => (
          <li key={category._id} className="flex flex-col rounded-lg border border-neutral-200 bg-neutral-0 p-4 text-sm">
            <p className="font-medium">{category.name}</p>
            <p className="text-neutral-500">
              {category.type}
              {category.isActive ? '' : ' · inactive'}
            </p>
            <span className="mt-3 flex flex-wrap items-center gap-2">
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
      <Pager
        page={page}
        pageSize={pageSize}
        total={total}
        label="Categories"
        onPageChange={(nextPage, nextSize) => {
          setPage(nextPage);
          setPageSize(nextSize);
        }}
      />
    </section>
  );
};

export default CategoriesPage;
