import { Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import Button, { EditLink } from '../../components/Button';
import DayEntriesModal from '../../components/DayEntriesModal';
import DayGroupList from '../../components/DayGroupList';
import Field, { inputClass } from '../../components/Field';
import { ErrorText } from '../../components/StatusMessage';
import { useAuth } from '../../hooks/useAuth';
import { useConfirm } from '../../hooks/useConfirm';
import { useToast } from '../../hooks/useToast';
import {
  createTransactionRequest,
  deleteTransactionRequest,
  getAccountsRequest,
  getCategoriesRequest,
  getTransactionDaysRequest,
  getTransactionsRequest,
} from '../../services/api';
import {
  datetimeLocalToIso,
  formatDateTime,
  formatDayKey,
  formatPeso,
  localDayBoundsIso,
  nowDatetimeLocal,
  toCentavos,
} from '../../utils/format';
import { hasErrors, requiredAmount, requiredChoice, requiredText } from '../../utils/validate';

const draftKey = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;

const blankTransaction = (seed = {}) => ({
  key: draftKey(),
  accountId: seed.accountId || '',
  type: seed.type || 'EXPENSE',
  amount: '',
  label: '',
  categoryId: seed.categoryId || '',
  transactionDate: nowDatetimeLocal(),
});

const collectPages = async (requestPage) => {
  const first = await requestPage(1);
  let data = first.data;
  for (let page = 2; page <= first.totalPages; page += 1) {
    const next = await requestPage(page);
    data = data.concat(next.data);
  }
  return data;
};

const TransactionsPage = () => {
  const { token } = useAuth();
  const { notify } = useToast();
  const confirm = useConfirm();
  const [days, setDays] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [drafts, setDrafts] = useState([blankTransaction()]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [entries, setEntries] = useState([]);
  const [dayLoading, setDayLoading] = useState(false);

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
    return getTransactionDaysRequest(token, page + 1, pageSize)
      .then((result) => {
        setDays(result.data);
        setTotal(result.total);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  const loadEntries = useCallback(
    (date) => {
      setDayLoading(true);
      const range = localDayBoundsIso(date);
      return collectPages((pageNumber) => getTransactionsRequest(token, pageNumber, 100, range))
        .then(setEntries)
        .catch((err) => setError(err.message))
        .finally(() => setDayLoading(false));
    },
    [token],
  );

  useEffect(() => {
    if (selectedDay) loadEntries(selectedDay.date);
  }, [selectedDay, loadEntries]);

  const updateDraft = (key, patch) => {
    setDrafts((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const onCreate = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    drafts.forEach((row) => {
      nextErrors[row.key] = {
        accountId: requiredChoice(row.accountId, 'Account'),
        categoryId: requiredChoice(row.categoryId, 'Category'),
        label: requiredText(row.label, 'Label'),
        amount: requiredAmount(row.amount),
        transactionDate: requiredChoice(row.transactionDate, 'Date'),
      };
    });
    setFieldErrors(nextErrors);
    if (drafts.some((row) => hasErrors(nextErrors[row.key]))) return;
    setError('');
    const pending = [...drafts];
    let saved = 0;
    for (const row of drafts) {
      try {
        await createTransactionRequest(
          {
            accountId: row.accountId,
            type: row.type,
            categoryId: row.categoryId,
            label: row.label,
            amount: toCentavos(row.amount),
            transactionDate: datetimeLocalToIso(row.transactionDate),
          },
          token,
        );
        saved += 1;
        pending.shift();
      } catch (err) {
        setDrafts(pending.length ? pending : [blankTransaction()]);
        setError(saved ? `${saved} saved. ${err.message}` : err.message);
        await load();
        return;
      }
    }
    notify(saved === 1 ? 'Transaction saved' : `${saved} transactions saved`);
    setDrafts([blankTransaction()]);
    setFieldErrors({});
    await load();
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
      const remaining = entries.filter((item) => item._id !== id);
      if (!remaining.length) {
        setSelectedDay(null);
        setEntries([]);
        if (days.length === 1 && page > 0) {
          setPage((current) => current - 1);
          return;
        }
      } else {
        setEntries(remaining);
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
        <DayGroupList
          days={days}
          loading={loading}
          page={page}
          pageSize={pageSize}
          total={total}
          amountLabel="Net"
          emptyLabel="No income or expenses yet."
          onOpen={setSelectedDay}
          onPageChange={(nextPage, nextSize) => {
            setPage(nextPage);
            setPageSize(nextSize);
          }}
        />
      </div>
      <form className="h-fit space-y-4 rounded-lg border border-neutral-200 bg-neutral-0 p-4" onSubmit={onCreate}>
        <h2 className="text-lg text-primary">Record money in or out</h2>
        {drafts.map((row, index) => {
          const errors = fieldErrors[row.key] || {};
          const matchingCategories = categories.filter((category) => category.type === row.type);
          return (
            <div key={row.key} className={`space-y-3 ${index ? 'border-t border-neutral-200 pt-3' : ''}`}>
              <div className="flex items-center justify-between">
                <p className="text-sm text-neutral-500">Entry {index + 1}</p>
                {drafts.length > 1 && (
                  <Button variant="ghost" onClick={() => setDrafts(drafts.filter((item) => item.key !== row.key))}>
                    Remove
                  </Button>
                )}
              </div>
              <Field label="Account" error={errors.accountId}>
                <select className={inputClass} required value={row.accountId} onChange={(event) => updateDraft(row.key, { accountId: event.target.value })}>
                  <option value="">Select</option>
                  {accounts.map((account) => (
                    <option key={account._id} value={account._id}>{account.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Type">
                <select className={inputClass} value={row.type} onChange={(event) => updateDraft(row.key, { type: event.target.value, categoryId: '' })}>
                  <option value="EXPENSE">Expense</option>
                  <option value="INCOME">Income</option>
                </select>
              </Field>
              <Field label="Category" error={errors.categoryId}>
                <select className={inputClass} required value={row.categoryId} onChange={(event) => updateDraft(row.key, { categoryId: event.target.value })}>
                  <option value="">Select</option>
                  {matchingCategories.map((category) => (
                    <option key={category._id} value={category._id}>{category.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Label" error={errors.label}>
                <input className={inputClass} required value={row.label} onChange={(event) => updateDraft(row.key, { label: event.target.value })} />
              </Field>
              <Field label="Amount (PHP)" error={errors.amount}>
                <input className={inputClass} required type="number" min="0.01" step="0.01" value={row.amount} onChange={(event) => updateDraft(row.key, { amount: event.target.value })} />
              </Field>
              <Field label="Date and time" error={errors.transactionDate}>
                <input className={inputClass} required type="datetime-local" value={row.transactionDate} onChange={(event) => updateDraft(row.key, { transactionDate: event.target.value })} />
              </Field>
            </div>
          );
        })}
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => setDrafts([...drafts, blankTransaction(drafts[drafts.length - 1])])}>
            Add another
          </Button>
          <Button onClick={onCreate}>Save all</Button>
        </div>
      </form>
      {selectedDay && (
        <DayEntriesModal
          title={formatDayKey(selectedDay.date)}
          loading={dayLoading}
          onClose={() => setSelectedDay(null)}
        >
          <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200">
            {entries.map((item) => (
              <li key={item._id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span>
                  {item.label}
                  <span className="ml-2 text-neutral-500">
                    {item.type} · {formatDateTime(item.transactionDate)}
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  {formatPeso(item.amount)}
                  <EditLink to={`/transactions/${item._id}/edit`}>Edit</EditLink>
                  <Button variant="danger" icon={Trash2} onClick={() => onDelete(item._id)}>
                    Delete
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        </DayEntriesModal>
      )}
    </section>
  );
};

export default TransactionsPage;
