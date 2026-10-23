import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../../components/Button';
import Field, { inputClass } from '../../components/Field';
import Select from '../../components/Select';
import FormModal from '../../components/FormModal';
import { Empty, Loading } from '../../components/StatusMessage';
import { useAuth } from '../../hooks/useAuth';
import { useFormErrorToast } from '../../hooks/useFormErrorToast';
import { afterSave, invalidateFamilies } from '../../query/cache';
import { useToast } from '../../hooks/useToast';
import SubBalanceSelect from '../../components/SubBalanceSelect';
import { getAccountsRequest, getTransferRequest, updateTransferRequest } from '../../services/api';
import {
  accountById,
  accountLabelWithBalance,
  accountOption,
  pocketIdForAccount,
  pocketOptions,
  selectableAccounts,
} from '../../utils/accounts';
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
  useFormErrorToast(error);

  useEffect(() => {
    let active = true;
    Promise.all([getTransferRequest(id, token), getAccountsRequest(token)])
      .then(([transfer, accountList]) => {
        if (!active) return;
        setAccounts(selectableAccounts(accountList, [transfer.fromAccountId, transfer.toAccountId]));
        const nextForm = {
          fromAccountId: transfer.fromAccountId || 'other',
          senderName: transfer.senderName || '',
          toAccountId: transfer.toAccountId || 'other',
          recipientName: transfer.recipientName || '',
          amount: fromCentavos(transfer.amount),
          fromSubBalanceId: transfer.fromSubBalanceId || '',
          toSubBalanceId: transfer.toSubBalanceId || '',
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
      fromSubBalanceId:
        form.fromAccountId !== 'other' && pocketOptions(accountById(accounts, form.fromAccountId)).length
          ? requiredChoice(form.fromSubBalanceId, 'From sub-balance')
          : '',
      toSubBalanceId:
        form.toAccountId !== 'other' && pocketOptions(accountById(accounts, form.toAccountId)).length
          ? requiredChoice(form.toSubBalanceId, 'To sub-balance')
          : '',
    };
    setFieldErrors(nextErrors);
    if (hasErrors(nextErrors)) return;
    if (form.fromAccountId === 'other' && form.toAccountId === 'other') {
      setError('One side must be one of your accounts');
      return;
    }
    if (
      form.fromAccountId !== 'other' &&
      form.fromAccountId === form.toAccountId &&
      form.fromSubBalanceId &&
      form.fromSubBalanceId === form.toSubBalanceId
    ) {
      setError('Choose two different sub-balances');
      return;
    }
    setError('');
    try {
      await afterSave(async () => {
        await updateTransferRequest(
          id,
          {
            fromAccountId: form.fromAccountId === 'other' ? null : form.fromAccountId,
            senderName: form.fromAccountId === 'other' ? form.senderName.trim() : '',
            toAccountId: form.toAccountId === 'other' ? null : form.toAccountId,
            recipientName: form.toAccountId === 'other' ? form.recipientName.trim() : '',
            amount: toCentavos(form.amount),
            transactionDate: datetimeLocalToIso(form.transactionDate),
            fromSubBalanceId: form.fromAccountId === 'other' ? null : form.fromSubBalanceId || null,
            toSubBalanceId: form.toAccountId === 'other' ? null : form.toSubBalanceId || null,
          },
          token,
        );
        navigate('/transfers');
        invalidateFamilies('transfers', 'dashboard', 'accounts');
        notify('Transfer updated');
      });
    } catch (err) {
      setError(err.message);
    }
  };

  const dirty = Boolean(form) && JSON.stringify(form) !== baseline;

  return (
    <FormModal dirty={dirty} closeTo="/transfers">
      {error && !form && <Empty label="Couldn't load this form." />}
      {!form && !error && <Loading variant="form" />}
      {form && (
    <form className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-0 p-4" onSubmit={onSubmit}>
      <h1 className="pr-8 text-2xl font-semibold text-primary-shade">Edit transfer</h1>
      <Field
        label={accountLabelWithBalance(
          'From',
          form.fromAccountId !== 'other' ? accountById(accounts, form.fromAccountId) : null,
        )}
        error={fieldErrors.fromAccountId}
      >
        <Select
          value={form.fromAccountId}
          options={[
            ...accounts.map(accountOption),
            { value: 'other', label: 'From other' },
          ]}
          onChange={(fromAccountId) =>
            setForm({
              ...form,
              fromAccountId,
              fromSubBalanceId: fromAccountId === 'other' ? '' : pocketIdForAccount(accounts, fromAccountId),
            })
          }
        />
      </Field>
      <SubBalanceSelect
        account={form.fromAccountId === 'other' ? null : accountById(accounts, form.fromAccountId)}
        value={form.fromSubBalanceId}
        error={fieldErrors.fromSubBalanceId}
        onChange={(fromSubBalanceId) => setForm({ ...form, fromSubBalanceId })}
        label="From sub-balance"
      />
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
      <Field
        label={accountLabelWithBalance(
          'To',
          form.toAccountId !== 'other' ? accountById(accounts, form.toAccountId) : null,
        )}
        error={fieldErrors.toAccountId}
      >
        <Select
          value={form.toAccountId}
          options={[
            ...accounts.map(accountOption),
            { value: 'other', label: 'To other' },
          ]}
          onChange={(toAccountId) =>
            setForm({
              ...form,
              toAccountId,
              toSubBalanceId: toAccountId === 'other' ? '' : pocketIdForAccount(accounts, toAccountId),
            })
          }
        />
      </Field>
      <SubBalanceSelect
        account={form.toAccountId === 'other' ? null : accountById(accounts, form.toAccountId)}
        value={form.toSubBalanceId}
        error={fieldErrors.toSubBalanceId}
        onChange={(toSubBalanceId) => setForm({ ...form, toSubBalanceId })}
        label="To sub-balance"
      />
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
      <Button type="submit">Save changes</Button>
    </form>
      )}
    </FormModal>
  );
};

export default TransferEditPage;
