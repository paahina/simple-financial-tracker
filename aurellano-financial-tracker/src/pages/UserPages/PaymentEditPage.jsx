import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../../components/Button';
import Field, { inputClass } from '../../components/Field';
import Select from '../../components/Select';
import FormModal from '../../components/FormModal';
import { ErrorText, Loading } from '../../components/StatusMessage';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { afterSave, invalidateFamilies } from '../../query/cache';
import { getAccountsRequest, getCategoriesRequest, getDebtRequest, updateDebtPaymentRequest } from '../../services/api';
import SubBalanceSelect from '../../components/SubBalanceSelect';
import { accountById, accountOption, pocketIdForAccount, pocketOptions, selectableAccounts } from '../../utils/accounts';
import { datetimeLocalInput, datetimeLocalToIso, fromCentavos, toCentavos } from '../../utils/format';
import { hasErrors, requiredAmount, requiredChoice, requiredText } from '../../utils/validate';

const PaymentEditPage = () => {
  const { id, paymentId } = useParams();
  const { token } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [baseline, setBaseline] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [incomeCategories, setIncomeCategories] = useState([]);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    let active = true;
    Promise.all([getDebtRequest(id, token), getAccountsRequest(token), getCategoriesRequest(token, { type: 'INCOME' })])
      .then(([detail, accountList, categories]) => {
        if (!active) return;
        const payment = detail.payments.find((item) => item._id === paymentId);
        if (!payment) {
          setError('Payment not found');
          return;
        }
        setAccounts(selectableAccounts(accountList, [payment.accountId]));
        setIncomeCategories(categories);
        const nextForm = {
          accountId: payment.accountId,
          subBalanceId: pocketIdForAccount(accountList, payment.accountId, payment.subBalanceId || ''),
          amount: fromCentavos(payment.amount),
          paymentDate: datetimeLocalInput(payment.paymentDate),
          notes: payment.notes || '',
          recordAsIncome: Boolean(payment.transactionId),
          incomeLabel: payment.income?.label || '',
          incomeCategoryId: payment.income?.categoryId || '',
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
  }, [id, paymentId, token]);

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
    setError('');
    try {
      await afterSave(async () => {
        await updateDebtPaymentRequest(
          paymentId,
          {
            accountId: form.accountId,
            subBalanceId: form.subBalanceId || null,
            amount: toCentavos(form.amount),
            paymentDate: datetimeLocalToIso(form.paymentDate),
            notes: form.notes,
            recordAsIncome: form.recordAsIncome,
            incomeLabel: form.recordAsIncome ? form.incomeLabel.trim() : undefined,
            incomeCategoryId: form.recordAsIncome ? form.incomeCategoryId : undefined,
          },
          token,
        );
        navigate(`/debts/${id}?tab=payments`);
        invalidateFamilies('debts', 'dashboard', 'accounts', 'transactions', 'reports');
        notify('Payment updated');
      });
    } catch (err) {
      setError(err.message);
    }
  };

  const dirty = Boolean(form) && JSON.stringify(form) !== baseline;

  return (
    <FormModal dirty={dirty} closeTo={`/debts/${id}?tab=payments`}>
      {error && !form && <ErrorText message={error} />}
      {!form && !error && <Loading variant="form" />}
      {form && (
    <form className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-0 p-4" onSubmit={onSubmit}>
      <h1 className="pr-8 text-2xl font-semibold text-primary-shade">Edit payment</h1>
      <ErrorText message={error} />
      <Field label="Money goes into" error={fieldErrors.accountId}>
        <Select
          value={form.accountId}
          options={accounts.map(accountOption)}
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
        <input className={inputClass} required type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} />
      </Field>
      <Field label="Date and time" error={fieldErrors.paymentDate}>
        <input className={inputClass} required type="datetime-local" value={form.paymentDate} onChange={(event) => setForm({ ...form, paymentDate: event.target.value })} />
      </Field>
      <Field label="Notes">
        <input className={inputClass} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
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
      <Button type="submit">Save changes</Button>
    </form>
      )}
    </FormModal>
  );
};

export default PaymentEditPage;
