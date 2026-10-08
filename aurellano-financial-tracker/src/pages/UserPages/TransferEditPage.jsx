import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../../components/Button';
import Field, { inputClass } from '../../components/Field';
import FormModal from '../../components/FormModal';
import { ErrorText, Loading } from '../../components/StatusMessage';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { getAccountsRequest, getTransferRequest, updateTransferRequest } from '../../services/api';
import { datetimeLocalInput, datetimeLocalToIso, fromCentavos, toCentavos } from '../../utils/format';
import { hasErrors, requiredAmount, requiredChoice, requiredText } from '../../utils/validate';

const TransferEditPage = () => {
  const { id } = useParams();
  const { token } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [baseline, setBaseline] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    let active = true;
    Promise.all([getTransferRequest(id, token), getAccountsRequest(token)])
      .then(([transfer, accountList]) => {
        if (!active) return;
        setAccounts(accountList.filter((account) => account.isActive));
        const nextForm = {
          fromAccountId: transfer.fromAccountId || 'other',
          senderName: transfer.senderName || '',
          toAccountId: transfer.toAccountId || 'other',
          recipientName: transfer.recipientName || '',
          amount: fromCentavos(transfer.amount),
          transactionDate: datetimeLocalInput(transfer.transactionDate),
        };
        setForm(nextForm);
        setBaseline(JSON.stringify(nextForm));
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
    const nextErrors = {
      fromAccountId: requiredChoice(form.fromAccountId, 'From'),
      toAccountId: requiredChoice(form.toAccountId, 'To'),
      senderName: form.fromAccountId === 'other' ? requiredText(form.senderName, 'Sender', 2) : '',
      recipientName: form.toAccountId === 'other' ? requiredText(form.recipientName, 'Recipient', 2) : '',
      amount: requiredAmount(form.amount),
      transactionDate: requiredChoice(form.transactionDate, 'Date'),
    };
    setFieldErrors(nextErrors);
    if (hasErrors(nextErrors)) return;
    if (form.fromAccountId === 'other' && form.toAccountId === 'other') {
      setError('One side must be one of your accounts');
      return;
    }
    setError('');
    try {
      await updateTransferRequest(
        id,
        {
          fromAccountId: form.fromAccountId === 'other' ? null : form.fromAccountId,
          senderName: form.fromAccountId === 'other' ? form.senderName.trim() : '',
          toAccountId: form.toAccountId === 'other' ? null : form.toAccountId,
          recipientName: form.toAccountId === 'other' ? form.recipientName.trim() : '',
          amount: toCentavos(form.amount),
          transactionDate: datetimeLocalToIso(form.transactionDate),
        },
        token,
      );
      notify('Transfer updated');
      navigate('/transfers');
    } catch (err) {
      setError(err.message);
    }
  };

  const dirty = Boolean(form) && JSON.stringify(form) !== baseline;

  return (
    <FormModal dirty={dirty} closeTo="/transfers">
      {error && !form && <ErrorText message={error} />}
      {!form && !error && <Loading variant="form" />}
      {form && (
    <form className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-0 p-4" onSubmit={onSubmit}>
      <h1 className="pr-8 text-2xl font-semibold text-primary-shade">Edit transfer</h1>
      <ErrorText message={error} />
      <Field label="From" error={fieldErrors.fromAccountId}>
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
        <Field label="Sender" error={fieldErrors.senderName}>
          <input
            className={inputClass}
            required
            minLength={2}
            value={form.senderName}
            onChange={(event) => setForm({ ...form, senderName: event.target.value })}
          />
        </Field>
      )}
      <Field label="To" error={fieldErrors.toAccountId}>
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
        <Field label="Recipient" error={fieldErrors.recipientName}>
          <input
            className={inputClass}
            required
            minLength={2}
            value={form.recipientName}
            onChange={(event) => setForm({ ...form, recipientName: event.target.value })}
          />
        </Field>
      )}
      <Field label="Amount (PHP)" error={fieldErrors.amount}>
        <input className={inputClass} required type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} />
      </Field>
      <Field label="Date and time" error={fieldErrors.transactionDate}>
        <input className={inputClass} required type="datetime-local" value={form.transactionDate} onChange={(event) => setForm({ ...form, transactionDate: event.target.value })} />
      </Field>
      <Button onClick={onSubmit}>Save changes</Button>
    </form>
      )}
    </FormModal>
  );
};

export default TransferEditPage;
