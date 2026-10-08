import { Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import Button, { EditLink } from '../../components/Button';
import Field, { inputClass } from '../../components/Field';
import PagedGrid from '../../components/PagedGrid';
import { ErrorText } from '../../components/StatusMessage';
import { useAuth } from '../../hooks/useAuth';
import { useConfirm } from '../../hooks/useConfirm';
import { useToast } from '../../hooks/useToast';
import {
  createTransactionRequest,
  deleteTransactionRequest,
  getAccountsRequest,
  getCategoriesRequest,
  getTransactionsRequest,
} from '../../services/api';
import { datetimeLocalToIso, formatDateTime, formatPeso, nowDatetimeLocal, toCentavos } from '../../utils/format';
import { hasErrors, requiredAmount, requiredChoice, requiredText } from '../../utils/validate';

const TransactionsPage = () => {
  const { token } = useAuth();
  const { notify } = useToast();
  const confirm = useConfirm();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [form, setForm] = useState({
    accountId: '',
    type: 'EXPENSE',
    amount: '',
    label: '',
    categoryId: '',
    transactionDate: nowDatetimeLocal(),
  });

  useEffect(() => {
    Promise.all([getAccountsRequest(token), getCategoriesRequest(token)])
      .then(([accountList, categoryList]) => {
        setAccounts(accountList.filter((account) => account.isActive));
        setCategories(categoryList);
      })
      .catch((err) => setError(err.message));
  }, [token]);

  const load = useCallback(() => {
    setLoading(true);
    return getTransactionsRequest(token, paginationModel.page + 1, paginationModel.pageSize)
      .then((transactions) => {
        setRows(transactions.data.map((item) => ({ ...item, id: item._id })));
        setTotal(transactions.total);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token, paginationModel]);

  useEffect(() => {
    load();
  }, [load]);

  const matchingCategories = categories.filter((category) => category.type === form.type);

  const onCreate = async (event) => {
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
      await createTransactionRequest(
        {
          ...form,
          amount: toCentavos(form.amount),
          transactionDate: datetimeLocalToIso(form.transactionDate),
        },
        token,
      );
      notify('Transaction saved');
      setForm({ ...form, amount: '', label: '', transactionDate: nowDatetimeLocal() });
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const onDelete = async (id) => {
    const accepted = await confirm({
      title: 'Delete transaction?',
      message: 'This removes the income or expense and updates the account balance.',
      confirmLabel: 'Delete',
      confirmVariant: 'danger',
      confirmIcon: Trash2,
    });
    if (!accepted) return;
    try {
      await deleteTransactionRequest(id, token);
      notify('Transaction deleted');
      if (rows.length === 1 && paginationModel.page > 0) {
        setPaginationModel((model) => ({ ...model, page: model.page - 1 }));
        return;
      }
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
        <div className="rounded-lg border border-neutral-200 bg-neutral-0">
          <PagedGrid
            rows={rows}
            rowCount={total}
            loading={loading}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            localeText={{ noRowsLabel: 'No income or expenses yet.' }}
            columns={[
              { field: 'label', headerName: 'Label', flex: 1, minWidth: 120, sortable: false, filterable: false },
              { field: 'type', headerName: 'Type', width: 110, sortable: false, filterable: false },
              {
                field: 'transactionDate',
                headerName: 'Date',
                flex: 1,
                minWidth: 170,
                sortable: false,
                filterable: false,
                renderCell: ({ row }) => formatDateTime(row.transactionDate),
              },
              {
                field: 'amount',
                headerName: 'Amount',
                width: 120,
                sortable: false,
                filterable: false,
                renderCell: ({ row }) => formatPeso(row.amount),
              },
              {
                field: 'actions',
                headerName: '',
                width: 210,
                sortable: false,
                filterable: false,
                renderCell: ({ row }) => (
                  <span className="flex items-center gap-2">
                    <EditLink to={`/transactions/${row.id}/edit`}>Edit</EditLink>
                    <Button variant="danger" icon={Trash2} onClick={() => onDelete(row.id)}>
                      Delete
                    </Button>
                  </span>
                ),
              },
            ]}
          />
        </div>
      </div>
      <form className="h-fit space-y-3 rounded-lg border border-neutral-200 bg-neutral-0 p-4" onSubmit={onCreate}>
        <h2 className="text-lg text-primary">Record money in or out</h2>
        <Field label="Account" error={fieldErrors.accountId}>
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
        <Field label="Category" error={fieldErrors.categoryId}>
          <select className={inputClass} required value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}>
            <option value="">Select</option>
            {matchingCategories.map((category) => (
              <option key={category._id} value={category._id}>
                {category.name}
              </option>
            ))}
          </select>
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
        <Button onClick={onCreate}>Save</Button>
      </form>
    </section>
  );
};

export default TransactionsPage;
