import { CircleOff } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Button, { EditLink } from '../../components/Button';
import Money from '../../components/Money';
import Pager from '../../components/Pager';
import { Empty, ErrorText, Loading } from '../../components/StatusMessage';
import { useAuth } from '../../hooks/useAuth';
import { useConfirm } from '../../hooks/useConfirm';
import { useToast } from '../../hooks/useToast';
import { deactivateAccountRequest, getAccountsRequest } from '../../services/api';

const AccountsPage = () => {
  const { token } = useAuth();
  const location = useLocation();
  const { notify } = useToast();
  const confirm = useConfirm();
  const [accounts, setAccounts] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [error, setError] = useState('');

  const load = useCallback(
    () =>
      getAccountsRequest(token, { page: page + 1, limit: pageSize })
        .then((result) => {
          setAccounts(result.data);
          setTotal(result.total);
        })
        .catch((err) => setError(err.message)),
    [token, page, pageSize],
  );

  useEffect(() => {
    load();
  }, [load]);

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
      await deactivateAccountRequest(id, token);
      notify('Account deactivated');
      if (accounts.length === 1 && page > 0) {
        setPage((current) => current - 1);
        return;
      }
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-primary-shade">Accounts</h1>
        <Link className="rounded-md bg-primary px-4 py-2 text-sm text-neutral-0" to="/accounts/new" state={{ backgroundLocation: location }}>
          New account
        </Link>
      </div>
      <ErrorText message={error} />
      {!accounts && !error && <Loading variant="cards" />}
      {accounts?.length === 0 && <Empty label="No accounts yet." />}
      <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {accounts?.map((account) => (
          <li key={account._id} className="flex flex-col rounded-lg border border-neutral-200 bg-neutral-0 p-4">
            <p className="font-medium">{account.name}</p>
            <p className="text-sm text-neutral-500">
              {account.type}
              {account.isActive ? '' : ' · inactive'}
            </p>
            <Money className="mt-2 block text-primary-shade" centavos={account.balance} />
            <span className="mt-3 flex flex-wrap items-center gap-2">
              <EditLink className="text-sm" to={`/accounts/${account._id}/edit`}>
                Edit
              </EditLink>
              {account.isActive && (
                <Button variant="warning" icon={CircleOff} onClick={() => onDeactivate(account._id)}>
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
        label="Accounts"
        onPageChange={(nextPage, nextSize) => {
          setPage(nextPage);
          setPageSize(nextSize);
        }}
      />
    </section>
  );
};

export default AccountsPage;
