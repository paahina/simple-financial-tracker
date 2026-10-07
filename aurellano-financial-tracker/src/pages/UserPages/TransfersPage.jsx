import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/Button';
import Field, { inputClass } from '../../components/Field';
import { Empty, ErrorText, Loading } from '../../components/StatusMessage';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import {
  createTransferRequest,
  deleteTransferRequest,
  getAccountsRequest,
  getTransfersRequest,
} from '../../services/api';
import { formatDate, formatPeso, todayInput, toCentavos, toIsoDate } from '../../utils/format';

const TransfersPage = () => {
  const { token } = useAuth();
  const { notify } = useToast();
  const [rows, setRows] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [activeAccounts, setActiveAccounts] = useState([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    fromAccountId: '',
    toAccountId: '',
    senderName: '',
    recipientName: '',
    amount: '',
    transactionDate: todayInput(),
  });

  const load = useCallback(
    () =>
      Promise.all([getTransfersRequest(token), getAccountsRequest(token)])
        .then(([transfers, accountList]) => {
          setRows(transfers.data);
          setAccounts(accountList);
          setActiveAccounts(accountList.filter((account) => account.isActive));
        })
        .catch((err) => setError(err.message)),
    [token],
  );

  useEffect(() => {
    load();
  }, [load]);

  const nameOf = (accountId) => accounts.find((account) => account._id === accountId)?.name || 'Account';

  const sourceOf = (item) => (item.senderName ? `other: ${item.senderName}` : nameOf(item.fromAccountId));

  const destinationOf = (item) =>
    item.recipientName ? `other: ${item.recipientName}` : nameOf(item.toAccountId);

  const transferBody = (values) => ({
    fromAccountId: values.fromAccountId === 'other' ? null : values.fromAccountId,
    senderName: values.fromAccountId === 'other' ? values.senderName.trim() : '',
    toAccountId: values.toAccountId === 'other' ? null : values.toAccountId,
    recipientName: values.toAccountId === 'other' ? values.recipientName.trim() : '',
    amount: toCentavos(values.amount),
    transactionDate: toIsoDate(values.transactionDate),
  });

  const onDelete = async (transferId) => {
    try {
      await deleteTransferRequest(transferId, token);
      notify('Transfer deleted');
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const onCreate = async (event) => {
    event.preventDefault();
    setError('');
    try {
      if (form.fromAccountId === 'other' && form.toAccountId === 'other') {
        setError('One side must be one of your accounts');
        return;
      }
      await createTransferRequest(transferBody(form), token);
      notify('Transfer saved');
      setForm({ ...form, amount: '' });
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="grid gap-8 lg:grid-cols-[2fr_1fr]">
      <div>
        <h1 className="mb-4 text-2xl font-semibold text-primary-shade">Transfers</h1>
        <p className="mb-4 text-sm text-neutral-500">
          Moving money between your accounts, in from someone else, or out to someone else, is not income or an expense.
        </p>
        <ErrorText message={error} />
        {!rows && <Loading />}
        {rows?.length === 0 && <Empty label="No transfers yet." />}
        <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-neutral-0">
          {rows?.map((item) => (
            <li key={item._id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span>
                {sourceOf(item)} to {destinationOf(item)}
                <span className="ml-2 text-neutral-500">{formatDate(item.transactionDate)}</span>
              </span>
              <span className="flex items-center gap-3">
                {formatPeso(item.amount)}
                <Link className="text-primary-shade underline" to={`/transfers/${item._id}/edit`}>
                  Edit
                </Link>
                <Button variant="ghost" onClick={() => onDelete(item._id)}>
                  Delete
                </Button>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <form className="h-fit space-y-3 rounded-lg border border-neutral-200 bg-neutral-0 p-4" onSubmit={onCreate}>
        <h2 className="text-lg text-primary">Move money</h2>
        <Field label="From">
          <select className={inputClass} required value={form.fromAccountId} onChange={(event) => setForm({ ...form, fromAccountId: event.target.value })}>
            <option value="">Select</option>
            {activeAccounts.map((account) => (
              <option key={account._id} value={account._id}>
                {account.name}
              </option>
            ))}
            <option value="other">From other</option>
          </select>
        </Field>
        {form.fromAccountId === 'other' && (
          <Field label="Sender">
            <input
              className={inputClass}
              required
              minLength={2}
              value={form.senderName}
              onChange={(event) => setForm({ ...form, senderName: event.target.value })}
            />
          </Field>
        )}
        <Field label="To">
          <select className={inputClass} required value={form.toAccountId} onChange={(event) => setForm({ ...form, toAccountId: event.target.value })}>
            <option value="">Select</option>
            {activeAccounts.map((account) => (
              <option key={account._id} value={account._id}>
                {account.name}
              </option>
            ))}
            <option value="other">To other</option>
          </select>
        </Field>
        {form.toAccountId === 'other' && (
          <Field label="Recipient">
            <input
              className={inputClass}
              required
              minLength={2}
              value={form.recipientName}
              onChange={(event) => setForm({ ...form, recipientName: event.target.value })}
            />
          </Field>
        )}
        <Field label="Amount (PHP)">
          <input className={inputClass} required type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} />
        </Field>
        <Field label="Date">
          <input className={inputClass} required type="date" value={form.transactionDate} onChange={(event) => setForm({ ...form, transactionDate: event.target.value })} />
        </Field>
        <Button onClick={onCreate}>Transfer</Button>
      </form>
    </section>
  );
};

export default TransfersPage;
