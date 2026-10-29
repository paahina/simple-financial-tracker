import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../../components/Button';
import Field, { inputClass } from '../../components/Field';
import Select from '../../components/Select';
import FormModal from '../../components/FormModal';
import { Empty, Loading } from '../../components/StatusMessage';
import { useAuth } from '../../hooks/useAuth';
import { useFormErrorToast } from '../../hooks/useFormErrorToast';
import { useToast } from '../../hooks/useToast';
import { afterSave, invalidateFamilies } from '../../query/cache';
import { getAccountsRequest, getCategoriesRequest, getDebtRequest, updateDebtPaymentRequest } from '../../services/api';
import SubBalanceSelect from '../../components/SubBalanceSelect';
import {
  accountById,
  accountLabelWithBalance,
  accountOption,
  pocketIdForAccount,
  pocketOptions,
  selectableAccounts,
} from '../../utils/accounts';
import { categoryIdForDebt, categoryOptionValue, categoryOptions, payloadCategoryId } from '../../utils/debts';
import { datetimeLocalInput, datetimeLocalToIso, fromCentavos, toCentavos } from '../../utils/format';
import { useConfirmSave } from '../../hooks/useConfirmSave';
import { hasErrors, requiredAmount, requiredChoice, requiredText } from '../../utils/validate';

const PaymentEditPage = () => {
  const { id, paymentId } = useParams();
  const { token } = useAuth();
  const { notify } = useToast();
  const confirmSave = useConfirmSave();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [baseline, setBaseline] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [debtKind, setDebtKind] = useState('INDIVIDUAL');
  const [payers, setPayers] = useState([]);
  const [debtCategories, setDebtCategories] = useState([]);
  const [debtDirection, setDebtDirection] = useState('RECEIVABLE');
  const [linkedCategories, setLinkedCategories] = useState([]);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  useFormErrorToast(error);

  useEffect(() => {
    let active = true;
    Promise.all([
      getDebtRequest(id, token),
      getAccountsRequest(token),
      getCategoriesRequest(token, { type: 'INCOME' }),
      getCategoriesRequest(token, { type: 'EXPENSE' }),
    ])
      .then(([detail, accountList, incomeCategories, expenseCategories]) => {
        if (!active) return;
        const payment = detail.payments.find((item) => item._id === paymentId);
        if (!payment) {
          setError('Payment not found');
          return;
        }
        setAccounts(selectableAccounts(accountList, [payment.accountId]));
        const direction = detail.debt?.direction === 'PAYABLE' ? 'PAYABLE' : 'RECEIVABLE';
        setDebtDirection(direction);
        setDebtKind(detail.debt?.kind || 'INDIVIDUAL');
        setPayers(detail.debt?.participants || []);
        setDebtCategories(detail.debt?.categories || []);
        setLinkedCategories(direction === 'PAYABLE' ? expenseCategories : incomeCategories);
        const nextForm = {
          accountId: payment.accountId,
          participantId: payment.participantId ? String(payment.participantId) : '',
          categoryId: categoryIdForDebt(
            detail.debt?.categories || [],
            categoryOptionValue(payment.categoryId),
          ),
          subBalanceId: pocketIdForAccount(accountList, payment.accountId, payment.subBalanceId || ''),
          amount: fromCentavos(payment.amount),
          paymentDate: datetimeLocalInput(payment.paymentDate),
          notes: payment.notes || '',
          recordAsIncome: direction === 'RECEIVABLE' && Boolean(payment.transactionId),
          incomeLabel: payment.income?.label || '',
          incomeCategoryId: payment.income?.categoryId || '',
          recordAsExpense: direction === 'PAYABLE' && Boolean(payment.transactionId),
          expenseLabel: payment.expense?.label || '',
          expenseCategoryId: payment.expense?.categoryId || '',
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

  const isPayable = debtDirection === 'PAYABLE';

  const onSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {
      accountId: requiredChoice(form.accountId, 'Account'),
      participantId: debtKind === 'CONTRIBUTION' ? requiredChoice(form.participantId, 'Payer') : '',
      categoryId: categoryOptions(debtCategories).length > 1 ? requiredChoice(form.categoryId, 'Category') : '',
      subBalanceId: pocketOptions(accountById(accounts, form.accountId)).length
        ? requiredChoice(form.subBalanceId, 'Sub-balance')
        : '',
      amount: requiredAmount(form.amount),
      paymentDate: requiredChoice(form.paymentDate, 'Date'),
      incomeLabel: !isPayable && form.recordAsIncome ? requiredText(form.incomeLabel, 'Income label') : '',
      incomeCategoryId:
        !isPayable && form.recordAsIncome ? requiredChoice(form.incomeCategoryId, 'Income category') : '',
      expenseLabel: isPayable && form.recordAsExpense ? requiredText(form.expenseLabel, 'Expense label') : '',
      expenseCategoryId:
        isPayable && form.recordAsExpense ? requiredChoice(form.expenseCategoryId, 'Expense category') : '',
    };
    setFieldErrors(nextErrors);
    if (hasErrors(nextErrors)) return;
    const accepted = await confirmSave({
      title: 'Save payment?',
      message: 'This updates the payment and may adjust account balances.',
    });
    if (!accepted) return;
    setError('');
    try {
      await afterSave(async () => {
        await updateDebtPaymentRequest(
          paymentId,
          {
            accountId: form.accountId,
            participantId: form.participantId || null,
            categoryId: payloadCategoryId(form.categoryId),
            subBalanceId: form.subBalanceId || null,
            amount: toCentavos(form.amount),
            paymentDate: datetimeLocalToIso(form.paymentDate),
            notes: form.notes,
            recordAsIncome: !isPayable && form.recordAsIncome,
            incomeLabel: !isPayable && form.recordAsIncome ? form.incomeLabel.trim() : undefined,
            incomeCategoryId: !isPayable && form.recordAsIncome ? form.incomeCategoryId : undefined,
            recordAsExpense: isPayable && form.recordAsExpense,
            expenseLabel: isPayable && form.recordAsExpense ? form.expenseLabel.trim() : undefined,
            expenseCategoryId: isPayable && form.recordAsExpense ? form.expenseCategoryId : undefined,
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
      {error && !form && <Empty label="Couldn't load this form." />}
      {!form && !error && <Loading variant="form" />}
      {form && (
    <form className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-0 p-4" onSubmit={onSubmit}>
      <h1 className="pr-8 text-2xl font-semibold text-primary-shade">Edit payment</h1>
      <Field
        label={accountLabelWithBalance(
          isPayable ? 'Money comes out of' : 'Money goes into',
          accountById(accounts, form.accountId),
        )}
        error={fieldErrors.accountId}
      >
        <Select
          value={form.accountId}
          options={accounts.map(accountOption)}
          onChange={(accountId) =>
            setForm({ ...form, accountId, subBalanceId: pocketIdForAccount(accounts, accountId) })
          }
        />
      </Field>
      {debtKind === 'CONTRIBUTION' ? (
        <Field label="Who paid" error={fieldErrors.participantId}>
          <Select
            value={form.participantId}
            options={payers.map((payer) => ({ value: payer.id, label: payer.name }))}
            onChange={(participantId) => setForm({ ...form, participantId })}
          />
        </Field>
      ) : null}
      {categoryOptions(debtCategories).length > 1 ? (
        <Field label="Apply to" error={fieldErrors.categoryId}>
          <Select
            value={form.categoryId}
            options={categoryOptions(debtCategories)}
            onChange={(categoryId) => setForm({ ...form, categoryId })}
          />
        </Field>
      ) : null}
      <SubBalanceSelect
        account={accountById(accounts, form.accountId)}
        value={form.subBalanceId}
        error={fieldErrors.subBalanceId}
        onChange={(subBalanceId) => setForm({ ...form, subBalanceId })}
        label={isPayable ? 'Deduct from' : 'Add to'}
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
      {isPayable ? (
        <>
          <label className="flex items-center gap-2 text-sm text-neutral-900">
            <input
              type="checkbox"
              checked={form.recordAsExpense}
              onChange={(event) => setForm({ ...form, recordAsExpense: event.target.checked })}
            />
            Also record as expense
          </label>
          {form.recordAsExpense ? (
            <>
              <Field label="Expense label" error={fieldErrors.expenseLabel}>
                <input
                  className={inputClass}
                  value={form.expenseLabel}
                  onChange={(event) => setForm({ ...form, expenseLabel: event.target.value })}
                />
              </Field>
              <Field label="Expense category" error={fieldErrors.expenseCategoryId}>
                <Select
                  value={form.expenseCategoryId}
                  options={linkedCategories.map((category) => ({ value: category._id, label: category.name }))}
                  onChange={(expenseCategoryId) => setForm({ ...form, expenseCategoryId })}
                />
              </Field>
            </>
          ) : null}
        </>
      ) : (
        <>
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
                  options={linkedCategories.map((category) => ({ value: category._id, label: category.name }))}
                  onChange={(incomeCategoryId) => setForm({ ...form, incomeCategoryId })}
                />
              </Field>
            </>
          ) : null}
        </>
      )}
      <Button type="submit">Save changes</Button>
    </form>
      )}
    </FormModal>
  );
};

export default PaymentEditPage;
