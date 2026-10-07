import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Button from '../../components/Button';
import Field, { inputClass } from '../../components/Field';
import { ErrorText, Loading } from '../../components/StatusMessage';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { getAccountsRequest, getTransferRequest, updateTransferRequest } from '../../services/api';
import { dateInput, fromCentavos, toCentavos, toIsoDate } from '../../utils/format';

const TransferEditPage = () => {
  const { id } = useParams();
  const { token } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([getTransferRequest(id, token), getAccountsRequest(token)])
      .then(([transfer, accountList]) => {
        if (!active) return;
        setAccounts(accountList.filter((account) => account.isActive));
        setForm({
          fromAccountId: transfer.fromAccountId || 'other',
          senderName: transfer.senderName || '',
          toAccountId: transfer.toAccountId || 'other',
          recipientName: transfer.recipientName || '',
          amount: fromCentavos(transfer.amount),
          transactionDate: dateInput(transfer.transactionDate),
        });
      })
      .catch((err) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, [id, token]);

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      if (form.fromAccountId === 'other' && form.toAccountId === 'other') {
        setError('One side must be one of your accounts');
        return;
      }
      await updateTransferRequest(
        id,
        {
          fromAccountId: form.fromAccountId === 'other' ? null : form.fromAccountId,
          senderName: form.fromAccountId === 'other' ? form.senderName.trim() : '',
          toAccountId: form.toAccountId === 'other' ? null : form.toAccountId,
          recipientName: form.toAccountId === 'other' ? form.recipientName.trim() : '',
          amount: toCentavos(form.amount),
          transactionDate: toIsoDate(form.transactionDate),
        },
        token,
      );
      notify('Transfer updated');
      navigate('/transfers');
    } catch (err) {
      setError(err.message);
    }
  };

  if (error && !form) return <ErrorText message={error} />;
  if (!form) return <Loading />;

  return (
    <form className="mx-auto max-w-lg space-y-3 rounded-lg border border-neutral-200 bg-neutral-0 p-4" onSubmit={onSubmit}>
      <Link className="text-sm text-primary-shade underline" to="/transfers">
        Back to transfers
      </Link>
      <h1 className="text-2xl font-semibold text-primary-shade">Edit transfer</h1>
      <ErrorText message={error} />
      <Field label="From">
        <select className={inputClass} required value={form.fromAccountId} onChange={(event) => setForm({ ...form, fromAccountId: event.target.value })}>
          {accounts.map((account) => (
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
          {accounts.map((account) => (
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
      <Button onClick={onSubmit}>Save changes</Button>
    </form>
  );
};

export default TransferEditPage;
