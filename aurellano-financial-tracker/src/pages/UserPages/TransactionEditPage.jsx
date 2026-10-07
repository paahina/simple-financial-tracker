import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Button from '../../components/Button';
import Field, { inputClass } from '../../components/Field';
import { ErrorText, Loading } from '../../components/StatusMessage';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import {
  getAccountsRequest,
  getCategoriesRequest,
  getTransactionRequest,
  updateTransactionRequest,
} from '../../services/api';
import { dateInput, fromCentavos, toCentavos, toIsoDate } from '../../utils/format';

const TransactionEditPage = () => {
  const { id } = useParams();
  const { token } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      getTransactionRequest(id, token),
      getAccountsRequest(token),
      getCategoriesRequest(token),
    ])
      .then(([transaction, accountList, categoryList]) => {
        if (!active) return;
        setAccounts(accountList.filter((account) => account.isActive));
        setCategories(categoryList);
        setForm({
          accountId: transaction.accountId,
          type: transaction.type,
          amount: fromCentavos(transaction.amount),
          label: transaction.label,
          categoryId: transaction.categoryId,
          transactionDate: dateInput(transaction.transactionDate),
        });
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
    setError('');
    try {
      await updateTransactionRequest(
        id,
        {
          ...form,
          amount: toCentavos(form.amount),
          transactionDate: toIsoDate(form.transactionDate),
        },
        token,
      );
      notify('Transaction updated');
      navigate('/transactions');
    } catch (err) {
      setError(err.message);
    }
  };

  if (error && !form) return <ErrorText message={error} />;
  if (!form) return <Loading />;

  return (
    <form className="mx-auto max-w-lg space-y-3 rounded-lg border border-neutral-200 bg-neutral-0 p-4" onSubmit={onSubmit}>
      <Link className="text-sm text-primary-shade underline" to="/transactions">
        Back to transactions
      </Link>
      <h1 className="text-2xl font-semibold text-primary-shade">Edit transaction</h1>
      <ErrorText message={error} />
      <Field label="Account">
        <select className={inputClass} required value={form.accountId} onChange={(event) => setForm({ ...form, accountId: event.target.value })}>
          {accounts.map((account) => (
            <option key={account._id} value={account._id}>
              {account.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Type">
        <select className={inputClass} value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value, categoryId: '' })}>
          <option value="EXPENSE">Expense</option>
          <option value="INCOME">Income</option>
        </select>
      </Field>
      <Field label="Category">
        <select className={inputClass} required value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}>
          <option value="">Select</option>
          {matchingCategories.map((category) => (
            <option key={category._id} value={category._id}>
              {category.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Label">
        <input className={inputClass} required value={form.label} onChange={(event) => setForm({ ...form, label: event.target.value })} />
      </Field>
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

export default TransactionEditPage;
