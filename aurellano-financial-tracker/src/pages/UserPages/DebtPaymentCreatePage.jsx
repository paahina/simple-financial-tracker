import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../../components/Button';
import Field, { inputClass } from '../../components/Field';
import Select from '../../components/Select';
import FormModal from '../../components/FormModal';
import { ErrorText, Loading } from '../../components/StatusMessage';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { afterSave, invalidateFamilies } from '../../query/cache';
import { createDebtPaymentRequest, getAccountsRequest, getCategoriesRequest } from '../../services/api';
import SubBalanceSelect from '../../components/SubBalanceSelect';
import { accountById, pocketIdForAccount, pocketOptions } from '../../utils/accounts';
import { datetimeLocalToIso, nowDatetimeLocal, toCentavos } from '../../utils/format';
import { hasErrors, requiredAmount, requiredChoice, requiredText } from '../../utils/validate';

const DebtPaymentCreatePage = () => {
  const { id } = useParams();
  const { token } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    accountId: '',
    subBalanceId: '',
    amount: '',
    paymentDate: nowDatetimeLocal(),
    recordAsIncome: false,
    incomeLabel: '',
    incomeCategoryId: '',
  });
  const [baseline] = useState(() => JSON.stringify(form));
  const [actionError, setActionError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const closeTo = `/debts/${id}?tab=payments`;

  const accountsQuery = useQuery({
    queryKey: ['accounts', 'options', { activeOnly: true }],
    queryFn: () => getAccountsRequest(token, { activeOnly: true }),
    enabled: Boolean(token),
  });
  const categoriesQuery = useQuery({
    queryKey: ['categories', 'options', { type: 'INCOME', includeInactive: false }],
    queryFn: () => getCategoriesRequest(token, { type: 'INCOME' }),
    enabled: Boolean(token),
  });
  const accounts = accountsQuery.data ?? null;
  const incomeCategories = categoriesQuery.data ?? [];
  const error = actionError || accountsQuery.error?.message || categoriesQuery.error?.message || '';

  const onSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {
      accountId: requiredChoice(form.accountId, 'Account'),
      subBalanceId: pocketOptions(accountById(accounts, form.accountId)).length
        ? requiredChoice(form.subBalanceId, 'Sub-balance')
        : '',
      amount: requiredAmount(form.amount),
      paymentDate: requiredChoice(form.paymentDate, 'Date'),
      incomeLabel: form.recordAsIncome ? requiredText(form.incomeLabel, 'Income label') : '',
      incomeCategoryId: form.recordAsIncome ? requiredChoice(form.incomeCategoryId, 'Income category') : '',
    };
    setFieldErrors(nextErrors);
    if (hasErrors(nextErrors)) return;
    setActionError('');
    try {
      await afterSave(async () => {
        await createDebtPaymentRequest(
          {
            debtId: id,
            accountId: form.accountId,
            subBalanceId: form.subBalanceId || null,
            amount: toCentavos(form.amount),
            paymentDate: datetimeLocalToIso(form.paymentDate),
            recordAsIncome: form.recordAsIncome,
            incomeLabel: form.recordAsIncome ? form.incomeLabel.trim() : undefined,
            incomeCategoryId: form.recordAsIncome ? form.incomeCategoryId : undefined,
          },
          token,
        );
        navigate(closeTo);
        invalidateFamilies('debts', 'dashboard', 'accounts', 'transactions', 'reports');
        notify('Payment recorded');
      });
    } catch (err) {
      setActionError(err.message);
    }
  };

  const dirty = JSON.stringify(form) !== baseline;

  return (
    <FormModal dirty={dirty} closeTo={closeTo}>
      {error && !accounts && <ErrorText message={error} />}
      {!accounts && !error && <Loading variant="form" />}
      {accounts && (
        <form className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-0 p-4" onSubmit={onSubmit}>
          <h1 className="pr-8 text-2xl font-semibold text-primary-shade">Record a payment</h1>
          <ErrorText message={error} />
          <Field label="Money goes into" error={fieldErrors.accountId}>
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
            label="Add to"
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
          <Field label="Date and time" error={fieldErrors.paymentDate}>
            <input
              className={inputClass}
              required
              type="datetime-local"
              value={form.paymentDate}
              onChange={(event) => setForm({ ...form, paymentDate: event.target.value })}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm text-neutral-900">
            <input
              type="checkbox"
              checked={form.recordAsIncome}
              onChange={(event) => setForm({ ...form, recordAsIncome: event.target.checked })}
            />
            Also record as income
          </label>
          {form.recordAsIncome ? (
            <>
              <Field label="Income label" error={fieldErrors.incomeLabel}>
                <input
                  className={inputClass}
                  value={form.incomeLabel}
                  onChange={(event) => setForm({ ...form, incomeLabel: event.target.value })}
                />
              </Field>
              <Field label="Income category" error={fieldErrors.incomeCategoryId}>
                <Select
                  value={form.incomeCategoryId}
                  options={incomeCategories.map((category) => ({ value: category._id, label: category.name }))}
                  onChange={(incomeCategoryId) => setForm({ ...form, incomeCategoryId })}
                />
              </Field>
            </>
          ) : null}
          <Button variant="tint" type="submit">
            Record payment
          </Button>
        </form>
      )}
    </FormModal>
  );
};

export default DebtPaymentCreatePage;
