import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button, { editLinkClass } from '../../components/Button';
import Field, { inputClass } from '../../components/Field';
import { ErrorText } from '../../components/StatusMessage';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import {
  createTransactionRequest,
  getAccountsRequest,
  getCategoriesRequest,
} from '../../services/api';
import { datetimeLocalToIso, nowDatetimeLocal, toCentavos } from '../../utils/format';
import { hasErrors, requiredAmount, requiredChoice, requiredText } from '../../utils/validate';

const draftKey = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;

const blankRow = (seed = {}) => ({
  key: draftKey(),
  accountId: seed.accountId || '',
  type: seed.type || 'EXPENSE',
  amount: '',
  label: '',
  categoryId: seed.categoryId || '',
});

const TransactionCreatePage = () => {
  const { token } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [dateError, setDateError] = useState('');
  const [transactionDate, setTransactionDate] = useState(nowDatetimeLocal());
  const [drafts, setDrafts] = useState([blankRow()]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([getAccountsRequest(token), getCategoriesRequest(token)])
      .then(([accountList, categoryList]) => {
        setAccounts(accountList.filter((account) => account.isActive));
        setCategories(categoryList);
      })
      .catch((err) => setError(err.message));
  }, [token]);

  const updateDraft = (key, patch) => {
    setDrafts((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const onSaveAll = async (event) => {
    event.preventDefault();
    const nextDateError = requiredChoice(transactionDate, 'Date');
    const nextErrors = {};
    drafts.forEach((row) => {
      nextErrors[row.key] = {
        accountId: requiredChoice(row.accountId, 'Account'),
        categoryId: requiredChoice(row.categoryId, 'Category'),
        label: requiredText(row.label, 'Label'),
        amount: requiredAmount(row.amount),
      };
    });
    setDateError(nextDateError);
    setFieldErrors(nextErrors);
    if (nextDateError || drafts.some((row) => hasErrors(nextErrors[row.key]))) return;
    setError('');
    setSaving(true);
    const pending = [...drafts];
    let saved = 0;
    try {
      for (const row of drafts) {
        await createTransactionRequest(
          {
            accountId: row.accountId,
            type: row.type,
            categoryId: row.categoryId,
            label: row.label,
            amount: toCentavos(row.amount),
            transactionDate: datetimeLocalToIso(transactionDate),
          },
          token,
        );
        saved += 1;
        pending.shift();
      }
      notify(saved === 1 ? 'Transaction saved' : `${saved} transactions saved`);
      navigate('/transactions');
    } catch (err) {
      setDrafts(pending.length ? pending : [blankRow()]);
      setError(saved ? `${saved} saved. ${err.message}` : err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-4">
      <Link className={`text-sm ${editLinkClass}`} to="/transactions">
        Back to transactions
      </Link>
      <h1 className="text-2xl font-semibold text-primary-shade">New transactions</h1>
      <ErrorText message={error} />
      <form className="space-y-4 rounded-lg border border-neutral-200 bg-neutral-0 p-4" onSubmit={onSaveAll}>
        <Field label="Date and time" error={dateError}>
          <input
            className={inputClass}
            required
            type="datetime-local"
            value={transactionDate}
            onChange={(event) => setTransactionDate(event.target.value)}
          />
        </Field>
        <p className="text-sm text-neutral-500">Every row below is saved with this date and time.</p>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-primary text-left text-neutral-0">
                <th className="px-3 py-2 font-bold">Account</th>
                <th className="px-3 py-2 font-bold">Type</th>
                <th className="px-3 py-2 font-bold">Category</th>
                <th className="px-3 py-2 font-bold">Label</th>
                <th className="px-3 py-2 font-bold">Amount</th>
                <th className="px-3 py-2 font-bold" />
              </tr>
            </thead>
            <tbody>
              {drafts.map((row) => {
                const errors = fieldErrors[row.key] || {};
                const matchingCategories = categories.filter((category) => category.type === row.type);
                return (
                  <tr key={row.key} className="border-b border-neutral-200 align-top">
                    <td className="px-2 py-2">
                      <select
                        className={inputClass}
                        required
                        value={row.accountId}
                        onChange={(event) => updateDraft(row.key, { accountId: event.target.value })}
                      >
                        <option value="">Select</option>
                        {accounts.map((account) => (
                          <option key={account._id} value={account._id}>
                            {account.name}
                          </option>
                        ))}
                      </select>
                      {errors.accountId ? <p className="mt-1 text-xs text-error-foreground">{errors.accountId}</p> : null}
                    </td>
                    <td className="px-2 py-2">
                      <select
                        className={inputClass}
                        value={row.type}
                        onChange={(event) => updateDraft(row.key, { type: event.target.value, categoryId: '' })}
                      >
                        <option value="EXPENSE">Expense</option>
                        <option value="INCOME">Income</option>
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <select
                        className={inputClass}
                        required
                        value={row.categoryId}
                        onChange={(event) => updateDraft(row.key, { categoryId: event.target.value })}
                      >
                        <option value="">Select</option>
                        {matchingCategories.map((category) => (
                          <option key={category._id} value={category._id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                      {errors.categoryId ? <p className="mt-1 text-xs text-error-foreground">{errors.categoryId}</p> : null}
                    </td>
                    <td className="px-2 py-2">
                      <input
                        className={inputClass}
                        required
                        value={row.label}
                        onChange={(event) => updateDraft(row.key, { label: event.target.value })}
                      />
                      {errors.label ? <p className="mt-1 text-xs text-error-foreground">{errors.label}</p> : null}
                    </td>
                    <td className="px-2 py-2">
                      <input
                        className={inputClass}
                        required
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={row.amount}
                        onChange={(event) => updateDraft(row.key, { amount: event.target.value })}
                      />
                      {errors.amount ? <p className="mt-1 text-xs text-error-foreground">{errors.amount}</p> : null}
                    </td>
                    <td className="px-2 py-2">
                      {drafts.length > 1 ? (
                        <Button variant="ghost" onClick={() => setDrafts(drafts.filter((item) => item.key !== row.key))}>
                          Remove
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            onClick={() =>
              setDrafts([
                ...drafts,
                blankRow({
                  accountId: drafts[drafts.length - 1].accountId,
                  type: drafts[drafts.length - 1].type,
                  categoryId: drafts[drafts.length - 1].categoryId,
                }),
              ])
            }
          >
            Add another
          </Button>
          <Button onClick={onSaveAll} disabled={saving}>
            {saving ? 'Saving…' : 'Save all'}
          </Button>
        </div>
      </form>
    </section>
  );
};

export default TransactionCreatePage;
