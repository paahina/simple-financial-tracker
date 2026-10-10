import { useQuery } from '@tanstack/react-query';
import { CircleCheck, CircleOff } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import AccountTypeChip from '../../components/AccountTypeChip';
import BelowRemainingChip from '../../components/BelowRemainingChip';
import Button, { EditLink } from '../../components/Button';
import Money from '../../components/Money';
import Pager from '../../components/Pager';
import Tabs from '../../components/Tabs';
import { Empty, ErrorText, Loading } from '../../components/StatusMessage';
import { useAuth } from '../../hooks/useAuth';
import { useConfirm } from '../../hooks/useConfirm';
import { useToast } from '../../hooks/useToast';
import { afterSave, invalidateFamilies } from '../../query/cache';
import { deactivateAccountRequest, getAccountsRequest, reactivateAccountRequest } from '../../services/api';
import { belowRemainingBalance } from '../../utils/accounts';

const emptyCounts = { active: 0, deactivated: 0 };

const AccountsPage = () => {
  const { token } = useAuth();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') === 'deactivated' ? 'deactivated' : 'active';
  const { notify } = useToast();
  const confirm = useConfirm();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [actionError, setActionError] = useState('');
  const accountsQuery = useQuery({
    queryKey: ['accounts', 'page', { page, pageSize, tab }],
    queryFn: () => getAccountsRequest(token, { page: page + 1, limit: pageSize, isActive: tab === 'active' }),
    enabled: Boolean(token),
  });
  const accounts = accountsQuery.data?.data ?? null;
  const total = accountsQuery.data?.total ?? 0;
  const counts = accountsQuery.data?.counts || emptyCounts;
  const error = actionError || accountsQuery.error?.message || '';

  const onDeactivate = async (id) => {
    const accepted = await confirm({
      title: 'Deactivate account?',
      message: 'This account will no longer appear when you record new activity.',
      confirmLabel: 'Deactivate',
      confirmVariant: 'warning',
      confirmIcon: CircleOff,
    });
    if (!accepted) return;
    try {
      await afterSave(async () => {
        await deactivateAccountRequest(id, token);
        invalidateFamilies('accounts', 'dashboard');
        notify('Account deactivated');
        if (accounts.length === 1 && page > 0) setPage((current) => current - 1);
      });
    } catch (err) {
      setActionError(err.message);
    }
  };

  const onReactivate = async (id) => {
    const accepted = await confirm({
      title: 'Reactivate account?',
      message: 'This account will show on the Active tab and can be used for new activity.',
      confirmLabel: 'Reactivate',
      confirmIcon: CircleCheck,
    });
    if (!accepted) return;
    try {
      await afterSave(async () => {
        await reactivateAccountRequest(id, token);
        invalidateFamilies('accounts', 'dashboard');
        notify('Account reactivated');
        if (accounts.length === 1 && page > 0) setPage((current) => current - 1);
      });
    } catch (err) {
      setActionError(err.message);
    }
  };

  const emptyLabel =
    counts.active === 0 && counts.deactivated === 0
      ? 'No accounts yet.'
      : tab === 'active'
        ? 'No active accounts.'
        : 'No deactivated accounts.';

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-primary-shade">Accounts</h1>
        <Link className="rounded-md bg-primary px-4 py-2 text-sm text-neutral-0" to="/accounts/new" state={{ backgroundLocation: location }}>
          New account
        </Link>
      </div>
      <Tabs
        value={tab}
        tabs={[
          { id: 'active', label: `Active ${counts.active}` },
          { id: 'deactivated', label: `Deactivated ${counts.deactivated}` },
        ]}
        onChange={(id) => {
          if (id === tab) return;
          setActionError('');
          setPage(0);
          setSearchParams(id === 'deactivated' ? { tab: 'deactivated' } : {});
        }}
      />
      <ErrorText message={error} />
      {accountsQuery.isPending && !error && <Loading variant="cards" />}
      {accounts?.length === 0 && <Empty label={emptyLabel} />}
      <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {accounts?.map((account) => (
          <li key={account._id} className="flex flex-col rounded-lg border border-neutral-200 bg-neutral-0 p-4">
            <p className="font-medium">{account.name}</p>
            <span className="mt-1">
              <AccountTypeChip type={account.type} />
            </span>
            <Money className="mt-2 block text-primary-shade" centavos={account.balance} />
            {belowRemainingBalance(account.balance, account.remainingBalance) && (
              <span className="mt-2">
                <BelowRemainingChip />
              </span>
            )}
            <span className="mt-3 flex flex-wrap items-center gap-2">
              <EditLink className="text-sm" to={`/accounts/${account._id}/edit`}>
                Edit
              </EditLink>
              {account.isActive ? (
                <Button variant="warning" icon={CircleOff} onClick={() => onDeactivate(account._id)}>
                  Deactivate
                </Button>
              ) : (
                <Button icon={CircleCheck} onClick={() => onReactivate(account._id)}>
                  Reactivate
                </Button>
              )}
            </span>
          </li>
        ))}
      </ul>
      {accounts && (
        <Pager
          page={page}
          pageSize={pageSize}
          total={total}
          label="Accounts"
          onPageChange={(nextPage, nextSize) => {
            setPage(nextPage);
            setPageSize(nextSize);
          }}
        />
      )}
    </section>
  );
};

export default AccountsPage;
