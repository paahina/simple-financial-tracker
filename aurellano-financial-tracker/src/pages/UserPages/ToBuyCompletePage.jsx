import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../../components/Button';
import Field, { inputClass } from '../../components/Field';
import FormModal from '../../components/FormModal';
import Select from '../../components/Select';
import SubBalanceSelect from '../../components/SubBalanceSelect';
import { Empty, Loading } from '../../components/StatusMessage';
import { useAuth } from '../../hooks/useAuth';
import { useFormErrorToast } from '../../hooks/useFormErrorToast';
import { useToast } from '../../hooks/useToast';
import { afterSave, invalidateFamilies } from '../../query/cache';
import { completeToBuyRequest, getAccountsRequest, getToBuyItemRequest } from '../../services/api';
import { accountById, accountLabelWithBalance, pocketIdForAccount, pocketOptions } from '../../utils/accounts';
import { formatPeso, toCentavos } from '../../utils/format';
import { hasErrors, requiredAmount, requiredChoice } from '../../utils/validate';

const ToBuyCompletePage = () => {
  const { id } = useParams();
  const { token } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ accountId: '', subBalanceId: '', amount: '' });
  const [baseline] = useState(() => JSON.stringify(form));
  const [actionError, setActionError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const itemQuery = useQuery({
    queryKey: ['to-buy', id],
    queryFn: () => getToBuyItemRequest(id, token),
    enabled: Boolean(token),
  });
  const accountsQuery = useQuery({
    queryKey: ['accounts', 'options', { activeOnly: true }],
    queryFn: () => getAccountsRequest(token, { activeOnly: true }),
    enabled: Boolean(token),
  });
  const item = itemQuery.data;
  const accounts = accountsQuery.data ?? null;
  const error = actionError || itemQuery.error?.message || accountsQuery.error?.message || '';
  useFormErrorToast(error);

  const onSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {
      accountId: requiredChoice(form.accountId, 'Account'),
      subBalanceId: pocketOptions(accountById(accounts, form.accountId)).length
        ? requiredChoice(form.subBalanceId, 'Deduct from')
        : '',
      amount: requiredAmount(form.amount),
    };
    setFieldErrors(nextErrors);
    if (hasErrors(nextErrors)) return;
    setActionError('');
    try {
      await afterSave(async () => {
        await completeToBuyRequest(
          id,
          {
            accountId: form.accountId,
            subBalanceId: form.subBalanceId || null,
            amount: toCentavos(form.amount),
          },
          token,
        );
        navigate('/to-buy');
        invalidateFamilies('to-buy', 'accounts', 'transactions', 'dashboard', 'reports');
        notify('Purchase recorded');
      });
    } catch (err) {
      setActionError(err.message);
    }
  };

  const dirty = JSON.stringify(form) !== baseline;

  return (
    <FormModal dirty={dirty} closeTo="/to-buy">
      {error && !accounts && <Empty label="Couldn't load this form." />}
      {(!accounts || itemQuery.isPending) && !error && <Loading variant="form" />}
      {accounts && item && (
        <form className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-0 p-4" onSubmit={onSubmit}>
          <h1 className="pr-8 text-2xl font-semibold text-primary-shade">Mark as done</h1>
          <p className="text-sm text-neutral-500">
            {item.name} · estimate {formatPeso(item.estimatedAmount)}. Enter what you actually paid.
          </p>
          <Field
            label={accountLabelWithBalance('Account', accountById(accounts, form.accountId))}
            error={fieldErrors.accountId}
          >
            <Select
              value={form.accountId}
              options={accounts.map((account) => ({ value: account._id, label: account.name }))}
              onChange={(accountId) =>
                setForm({ ...form, accountId, subBalanceId: pocketIdForAccount(accounts, accountId) })
              }
            />
          </Field>
          <SubBalanceSelect
            account={accountById(accounts, form.accountId)}
            value={form.subBalanceId}
            error={fieldErrors.subBalanceId}
            onChange={(subBalanceId) => setForm({ ...form, subBalanceId })}
            label="Deduct from"
          />
          <Field label="Amount (PHP)" error={fieldErrors.amount}>
            <input
              className={inputClass}
              required
              type="number"
              min="0.01"
              step="0.01"
              value={form.amount}
              onChange={(event) => setForm({ ...form, amount: event.target.value })}
            />
          </Field>
          <Button type="submit">Record expense</Button>
        </form>
      )}
    </FormModal>
  );
};

export default ToBuyCompletePage;
