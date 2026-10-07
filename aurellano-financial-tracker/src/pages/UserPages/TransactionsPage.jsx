import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/Button';
import Field, { inputClass } from '../../components/Field';
import { Empty, ErrorText, Loading } from '../../components/StatusMessage';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import {
  createTransactionRequest,
  deleteTransactionRequest,
  getAccountsRequest,
  getCategoriesRequest,
  getTransactionsRequest,
} from '../../services/api';
import { formatDate, formatPeso, todayInput, toCentavos, toIsoDate } from '../../utils/format';

const TransactionsPage = () => {
  const { token } = useAuth();
  const { notify } = useToast();
  const [rows, setRows] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    accountId: '',
    type: 'EXPENSE',
    amount: '',
    label: '',
    categoryId: '',
    transactionDate: todayInput(),
  });

  const load = useCallback(
    () =>
      Promise.all([
        getTransactionsRequest(token),
        getAccountsRequest(token),
        getCategoriesRequest(token),
      ])
        .then(([transactions, accountList, categoryList]) => {
          setRows(transactions.data);
          setAccounts(accountList.filter((account) => account.isActive));
          setCategories(categoryList);
        })
        .catch((err) => setError(err.message)),
    [token],
  );

  useEffect(() => {
    load();
  }, [load]);

  const matchingCategories = categories.filter((category) => category.type === form.type);

  const onCreate = async (event) => {
    event.preventDefault();
    setError('');
    try {
      await createTransactionRequest(
        {
          ...form,
          amount: toCentavos(form.amount),
          transactionDate: toIsoDate(form.transactionDate),
        },
        token,
      );
      notify('Transaction saved');
      setForm({ ...form, amount: '', label: '' });
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const onDelete = async (id) => {
    try {
      await deleteTransactionRequest(id, token);
      notify('Transaction deleted');
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="grid gap-8 lg:grid-cols-[2fr_1fr]">
      <div>
        <h1 className="mb-4 text-2xl font-semibold text-primary-shade">Transactions</h1>
        <ErrorText message={error} />
        {!rows && <Loading />}
        {rows?.length === 0 && <Empty label="No income or expenses yet." />}
        <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-neutral-0">
          {rows?.map((item) => (
            <li key={item._id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span>
                {item.label}
                <span className="ml-2 text-neutral-500">
                  {item.type} · {formatDate(item.transactionDate)}
                </span>
              </span>
              <span className="flex items-center gap-3">
                {formatPeso(item.amount)}
                <Link className="text-primary-shade underline" to={`/transactions/${item._id}/edit`}>
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
        <h2 className="text-lg text-primary">Record money in or out</h2>
        <Field label="Account">
          <select className={inputClass} required value={form.accountId} onChange={(event) => setForm({ ...form, accountId: event.target.value })}>
            <option value="">Select</option>
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
        <Button onClick={onCreate}>Save</Button>
      </form>
    </section>
  );
};

export default TransactionsPage;
