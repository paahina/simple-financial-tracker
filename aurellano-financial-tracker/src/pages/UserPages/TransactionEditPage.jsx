import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../../components/Button';
import Field, { inputClass } from '../../components/Field';
import Select from '../../components/Select';
import { transactionTypeOptions } from '../../components/TransactionTypeChip';
import FormModal from '../../components/FormModal';
import { ErrorText, Loading } from '../../components/StatusMessage';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import {
  getAccountsRequest,
  getCategoriesRequest,
  getTransactionRequest,
  updateTransactionRequest,
} from '../../services/api';
import { accountOption, selectableAccounts } from '../../utils/accounts';
import { datetimeLocalInput, datetimeLocalToIso, fromCentavos, toCentavos } from '../../utils/format';
import { hasErrors, requiredAmount, requiredChoice, requiredText } from '../../utils/validate';

const TransactionEditPage = () => {
  const { id } = useParams();
  const { token } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [baseline, setBaseline] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    let active = true;
    Promise.all([
      getTransactionRequest(id, token),
      getAccountsRequest(token),
      getCategoriesRequest(token),
    ])
      .then(([transaction, accountList, categoryList]) => {
        if (!active) return;
        setAccounts(selectableAccounts(accountList, [transaction.accountId]));
        setCategories(categoryList);
        const nextForm = {
          accountId: transaction.accountId,
          type: transaction.type,
          amount: fromCentavos(transaction.amount),
          label: transaction.label,
          categoryId: transaction.categoryId,
          transactionDate: datetimeLocalInput(transaction.transactionDate),
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

  const matchingCategories = categories.filter((category) => category.type === form?.type);

  const onSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {
      accountId: requiredChoice(form.accountId, 'Account'),
      categoryId: requiredChoice(form.categoryId, 'Category'),
      label: requiredText(form.label, 'Label'),
      amount: requiredAmount(form.amount),
      transactionDate: requiredChoice(form.transactionDate, 'Date'),
    };
    setFieldErrors(nextErrors);
    if (hasErrors(nextErrors)) return;
    setError('');
    try {
      await updateTransactionRequest(
        id,
        {
          ...form,
          amount: toCentavos(form.amount),
          transactionDate: datetimeLocalToIso(form.transactionDate),
        },
        token,
      );
      notify('Transaction updated');
      navigate('/transactions');
    } catch (err) {
      setError(err.message);
    }
  };

  const dirty = Boolean(form) && JSON.stringify(form) !== baseline;

  return (
    <FormModal dirty={dirty} closeTo="/transactions">
      {error && !form && <ErrorText message={error} />}
      {!form && !error && <Loading variant="form" />}
      {form && (
    <form className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-0 p-4" onSubmit={onSubmit}>
      <h1 className="pr-8 text-2xl font-semibold text-primary-shade">Edit transaction</h1>
      <ErrorText message={error} />
      <Field label="Account" error={fieldErrors.accountId}>
        <Select
          value={form.accountId}
          options={accounts.map(accountOption)}
          onChange={(accountId) => setForm({ ...form, accountId })}
        />
      </Field>
      <Field label="Type">
        <Select
          value={form.type}
          options={transactionTypeOptions}
          onChange={(type) => setForm({ ...form, type, categoryId: '' })}
        />
      </Field>
      <Field label="Category" error={fieldErrors.categoryId}>
        <Select
          value={form.categoryId}
          options={matchingCategories.map((category) => ({ value: category._id, label: category.name }))}
          onChange={(categoryId) => setForm({ ...form, categoryId })}
        />
      </Field>
      <Field label="Label" error={fieldErrors.label}>
        <input className={inputClass} required value={form.label} onChange={(event) => setForm({ ...form, label: event.target.value })} />
      </Field>
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

export default TransactionEditPage;
