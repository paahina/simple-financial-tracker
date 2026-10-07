import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/Button';
import Field, { inputClass } from '../../components/Field';
import { Empty, ErrorText, Loading } from '../../components/StatusMessage';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { createAccountRequest, deactivateAccountRequest, getAccountsRequest } from '../../services/api';
import { formatPeso, toCentavos } from '../../utils/format';

const emptyForm = { name: '', type: 'CASH', initialBalance: '', description: '' };

const AccountsPage = () => {
  const { token } = useAuth();
  const { notify } = useToast();
  const [accounts, setAccounts] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const load = useCallback(
    () =>
      getAccountsRequest(token)
        .then(setAccounts)
        .catch((err) => setError(err.message)),
    [token],
  );

  useEffect(() => {
    load();
  }, [load]);

  const onCreate = async (event) => {
    event.preventDefault();
    setError('');
    try {
      await createAccountRequest(
        {
          name: form.name,
          type: form.type,
          initialBalance: toCentavos(form.initialBalance || 0),
          currency: 'PHP',
          description: form.description,
        },
        token,
      );
      setForm(emptyForm);
      notify('Account created');
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const onDeactivate = async (id) => {
    try {
      await deactivateAccountRequest(id, token);
      notify('Account deactivated');
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="grid gap-8 lg:grid-cols-[2fr_1fr]">
      <div>
        <h1 className="mb-4 text-2xl font-semibold text-primary-shade">Accounts</h1>
        <ErrorText message={error} />
        {!accounts && <Loading />}
        {accounts?.length === 0 && <Empty label="No accounts yet." />}
        <ul className="space-y-3">
          {accounts?.map((account) => (
            <li key={account._id} className="rounded-lg border border-neutral-200 bg-neutral-0 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{account.name}</p>
                  <p className="text-sm text-neutral-500">
                    {account.type}
                    {account.isActive ? '' : ' · inactive'}
                  </p>
                  <p className="mt-2 text-primary-shade">{formatPeso(account.balance)}</p>
                </div>
                <span className="flex items-center gap-2">
                  <Link className="text-sm text-primary-shade underline" to={`/accounts/${account._id}/edit`}>
                    Edit
                  </Link>
                  {account.isActive && (
                    <Button variant="ghost" onClick={() => onDeactivate(account._id)}>
                      Deactivate
                    </Button>
                  )}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <form className="h-fit space-y-3 rounded-lg border border-neutral-200 bg-neutral-0 p-4" onSubmit={onCreate}>
        <h2 className="text-lg text-primary">New account</h2>
        <Field label="Name">
          <input className={inputClass} required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        </Field>
        <Field label="Type">
          <select className={inputClass} value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
            <option value="CASH">Cash</option>
            <option value="E_WALLET">E-wallet</option>
            <option value="BANK">Bank</option>
          </select>
        </Field>
        <Field label="Current amount (PHP)">
          <input className={inputClass} type="number" min="0" step="0.01" value={form.initialBalance} onChange={(event) => setForm({ ...form, initialBalance: event.target.value })} />
        </Field>
        <Button onClick={onCreate}>Save account</Button>
      </form>
    </section>
  );
};

export default AccountsPage;
