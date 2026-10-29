import { useQuery } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import Button, { EditLink } from '../../components/Button';
import Pager from '../../components/Pager';
import StatusChip from '../../components/StatusChip';
import Tabs from '../../components/Tabs';
import { Empty, ErrorText, Loading } from '../../components/StatusMessage';
import { useAuth } from '../../hooks/useAuth';
import { useConfirm } from '../../hooks/useConfirm';
import { useToast } from '../../hooks/useToast';
import { afterSave, invalidateFamilies } from '../../query/cache';
import { deleteDebtRequest, getDebtsRequest } from '../../services/api';
import { formatDate, formatPeso } from '../../utils/format';

const directionTabs = [
  { id: 'receivable', label: 'Owed to you', value: 'RECEIVABLE' },
  { id: 'payable', label: 'You owe', value: 'PAYABLE' },
];

const statusTabs = [
  { id: 'pending', label: 'Pending', value: 'PENDING' },
  { id: 'partially_paid', label: 'Partially paid', value: 'PARTIALLY_PAID' },
  { id: 'paid', label: 'Paid', value: 'PAID' },
  { id: 'overdue', label: 'Overdue', value: 'OVERDUE' },
];

const emptyCounts = { PENDING: 0, PARTIALLY_PAID: 0, PAID: 0, OVERDUE: 0 };

const buildSearchParams = ({ directionId, statusId }) => {
  const next = {};
  if (directionId === 'payable') next.direction = 'payable';
  if (statusId !== 'pending') next.status = statusId;
  return next;
};

const DebtsPage = () => {
  const { token } = useAuth();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const directionId = directionTabs.some((tab) => tab.id === searchParams.get('direction'))
    ? searchParams.get('direction')
    : 'receivable';
  const direction = directionTabs.find((tab) => tab.id === directionId);
  const statusId = statusTabs.some((tab) => tab.id === searchParams.get('status'))
    ? searchParams.get('status')
    : 'pending';
  const status = statusTabs.find((tab) => tab.id === statusId);
  const { notify } = useToast();
  const confirm = useConfirm();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [actionError, setActionError] = useState('');
  const debtsQuery = useQuery({
    queryKey: ['debts', 'page', { page, pageSize, status: status.value, direction: direction.value }],
    queryFn: () =>
      getDebtsRequest(token, {
        page: page + 1,
        limit: pageSize,
        status: status.value,
        direction: direction.value,
      }),
    enabled: Boolean(token),
  });
  const debts = debtsQuery.data?.data ?? null;
  const total = debtsQuery.data?.total ?? 0;
  const counts = debtsQuery.data?.counts || emptyCounts;
  const error = actionError || debtsQuery.error?.message || '';
  const newDebtTo =
    directionId === 'payable' ? '/debts/new?direction=payable' : '/debts/new';

  const onDelete = async (debtId) => {
    const accepted = await confirm({
      title: 'Delete debt?',
      message: 'This removes the debt. Debts with payments must have those payments deleted first.',
      confirmLabel: 'Delete',
      confirmVariant: 'danger',
      confirmIcon: Trash2,
    });
    if (!accepted) return;
    try {
      await afterSave(async () => {
        await deleteDebtRequest(debtId, token);
        invalidateFamilies('debts', 'dashboard');
        notify('Debt deleted');
        if (debts.length === 1 && page > 0) setPage((current) => current - 1);
      });
    } catch (err) {
      setActionError(err.message);
    }
  };

  const emptyLabel =
    directionId === 'payable'
      ? Object.values(counts).every((count) => count === 0)
        ? 'You have no payables yet.'
        : `No ${status.label.toLowerCase()} payables.`
      : Object.values(counts).every((count) => count === 0)
        ? 'Nobody owes you money yet.'
        : `No ${status.label.toLowerCase()} receivables.`;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-primary-shade">Debts</h1>
        <Link
          className="rounded-md bg-primary px-4 py-2 text-sm text-neutral-0"
          to={newDebtTo}
          state={{ backgroundLocation: location }}
        >
          New debt
        </Link>
      </div>
      <p className="text-sm text-neutral-500">
        {directionId === 'payable'
          ? 'Money you owe others. Payments come out of your accounts when you record them.'
          : 'Money others owe you. It is separate from the cash in your accounts until you record a payment.'}
      </p>
      <Tabs
        value={directionId}
        tabs={directionTabs.map((tab) => ({
          id: tab.id,
          label: tab.label,
        }))}
        onChange={(id) => {
          if (id === directionId) return;
          setActionError('');
          setPage(0);
          setSearchParams(buildSearchParams({ directionId: id, statusId }));
        }}
      />
      <Tabs
        value={statusId}
        tabs={statusTabs.map((tab) => ({
          id: tab.id,
          label: `${tab.label} ${counts[tab.value]}`,
        }))}
        onChange={(id) => {
          if (id === statusId) return;
          setActionError('');
          setPage(0);
          setSearchParams(buildSearchParams({ directionId, statusId: id }));
        }}
      />
      <ErrorText message={error} />
      {debtsQuery.isPending && !error && <Loading variant="cards" />}
      {debts?.length === 0 && <Empty label={emptyLabel} />}
      <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {debts?.map((debt) => (
          <li key={debt._id} className="flex flex-col rounded-lg border border-neutral-200 bg-neutral-0 p-4 text-sm">
            <p className="font-medium">{debt.personName}</p>
            <p className="flex flex-wrap items-center gap-2 text-neutral-500">
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs">
                {debt.kind === 'CONTRIBUTION' ? 'Contribution' : 'Individual'}
              </span>
              <StatusChip status={debt.status} />
              <span>{debt.dueDate ? `due ${formatDate(debt.dueDate)}` : 'No due date'}</span>
            </p>
            {debt.description?.trim() ? <p className="mt-2 font-semibold text-primary">{debt.description}</p> : null}
            <p className="mt-2">
              Remaining {formatPeso(debt.remainingAmount)} of {formatPeso(debt.totalAmount)}
            </p>
            <span className="mt-3 flex flex-wrap items-center gap-2">
              <Link className="text-primary-shade underline" to={`/debts/${debt._id}?tab=payments`}>
                Payments
              </Link>
              <EditLink to={`/debts/${debt._id}/edit`}>Edit</EditLink>
              {debt.paidAmount === 0 && (
                <Button variant="danger" icon={Trash2} onClick={() => onDelete(debt._id)}>
                  Delete
                </Button>
              )}
            </span>
          </li>
        ))}
      </ul>
      {debts && (
        <Pager
          page={page}
          pageSize={pageSize}
          total={total}
          label="Debts"
          onPageChange={(nextPage, nextSize) => {
            setPage(nextPage);
            setPageSize(nextSize);
          }}
        />
      )}
    </section>
  );
};

export default DebtsPage;
