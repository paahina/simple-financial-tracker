import { useQuery } from '@tanstack/react-query';
import { Check, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Button, { EditLink } from '../../components/Button';
import Pager from '../../components/Pager';
import { Empty, ErrorText, Loading } from '../../components/StatusMessage';
import { useAuth } from '../../hooks/useAuth';
import { useConfirm } from '../../hooks/useConfirm';
import { useToast } from '../../hooks/useToast';
import { afterSave, invalidateFamilies } from '../../query/cache';
import { deleteToBuyRequest, getToBuyRequest } from '../../services/api';
import { formatPeso } from '../../utils/format';

const ToBuyPage = () => {
  const { token } = useAuth();
  const location = useLocation();
  const { notify } = useToast();
  const confirm = useConfirm();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [actionError, setActionError] = useState('');
  const listQuery = useQuery({
    queryKey: ['to-buy', 'page', { page, pageSize }],
    queryFn: () => getToBuyRequest(token, { page: page + 1, limit: pageSize }),
    enabled: Boolean(token),
  });
  const items = listQuery.data?.data ?? null;
  const total = listQuery.data?.total ?? 0;
  const estimatedTotal = listQuery.data?.estimatedTotal ?? 0;
  const error = actionError || listQuery.error?.message || '';

  const onDelete = async (id) => {
    const accepted = await confirm({
      title: 'Delete this item?',
      message: 'This removes it from the list. It will not record an expense.',
      confirmLabel: 'Delete',
      confirmVariant: 'danger',
      confirmIcon: Trash2,
    });
    if (!accepted) return;
    try {
      await afterSave(async () => {
        await deleteToBuyRequest(id, token);
        invalidateFamilies('to-buy');
        notify('Item deleted');
        if (items.length === 1 && page > 0) setPage((current) => current - 1);
      });
    } catch (err) {
      setActionError(err.message);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-primary-shade">To-Buy</h1>
        <Link
          className="rounded-md bg-primary px-4 py-2 text-sm text-neutral-0"
          to="/to-buy/new"
          state={{ backgroundLocation: location }}
        >
          Add item
        </Link>
      </div>
      <p className="text-sm text-neutral-500">
        Plan purchases here. Marking an item done records an expense and removes it from the list.
      </p>
      <p className="text-sm">
        Estimated total {formatPeso(estimatedTotal)}
      </p>
      <ErrorText message={error} />
      {listQuery.isPending && !error && <Loading variant="cards" />}
      {items?.length === 0 && <Empty label="Nothing to buy yet." />}
      <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items?.map((item) => (
          <li key={item._id} className="flex flex-col rounded-lg border border-neutral-200 bg-neutral-0 p-4 text-sm">
            <p className="font-medium">{item.name}</p>
            <p className="mt-1 text-neutral-500">
              {item.quantity} × {formatPeso(item.unitPrice)}
            </p>
            <p className="mt-2">Estimate {formatPeso(item.estimatedAmount)}</p>
            {item.notes?.trim() ? <p className="mt-2 text-neutral-500">{item.notes}</p> : null}
            <span className="mt-3 flex flex-wrap items-center gap-2">
              <Link
                className="inline-flex items-center gap-1 rounded-md bg-primary-tint px-4 py-2 text-sm text-neutral-0"
                to={`/to-buy/${item._id}/done`}
                state={{ backgroundLocation: location }}
              >
                <Check size={16} aria-hidden="true" />
                Done
              </Link>
              <EditLink to={`/to-buy/${item._id}/edit`}>Edit</EditLink>
              <Button variant="danger" icon={Trash2} onClick={() => onDelete(item._id)}>
                Delete
              </Button>
            </span>
          </li>
        ))}
      </ul>
      {items && (
        <Pager
          page={page}
          pageSize={pageSize}
          total={total}
          label="Items"
          onPageChange={(nextPage, nextSize) => {
            setPage(nextPage);
            setPageSize(nextSize);
          }}
        />
      )}
    </section>
  );
};

export default ToBuyPage;
