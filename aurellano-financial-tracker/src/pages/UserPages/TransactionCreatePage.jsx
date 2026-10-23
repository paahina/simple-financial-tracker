import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/Button';
import Field, { inputClass } from '../../components/Field';
import FormModal from '../../components/FormModal';
import Select from '../../components/Select';
import { transactionTypeOptions } from '../../components/TransactionTypeChip';
import { useAuth } from '../../hooks/useAuth';
import { useFormErrorToast } from '../../hooks/useFormErrorToast';
import { afterSave, invalidateFamilies } from '../../query/cache';
import { useToast } from '../../hooks/useToast';
import {
  createTransactionRequest,
  getAccountsRequest,
  getCategoriesRequest,
} from '../../services/api';
import SubBalanceSelect from '../../components/SubBalanceSelect';
import { datetimeLocalToIso, nowDatetimeLocal, toCentavos } from '../../utils/format';
import {
  accountById,
  accountLabelWithBalance,
  labelWithBalance,
  pocketAmount,
  pocketIdForAccount,
  pocketOptions,
} from '../../utils/accounts';
import { hasErrors, requiredAmount, requiredChoice, requiredText } from '../../utils/validate';

const draftKey = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;

const blankRow = (seed = {}) => ({
  key: draftKey(),
  accountId: seed.accountId || '',
  type: seed.type || 'EXPENSE',
  amount: '',
  label: '',
  categoryId: seed.categoryId || '',
  subBalanceId: seed.subBalanceId || '',
});

const TransactionCreatePage = () => {
  const { token } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [actionError, setActionError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [dateError, setDateError] = useState('');
  const [transactionDate, setTransactionDate] = useState(nowDatetimeLocal());
  const [drafts, setDrafts] = useState([blankRow()]);
  const [saving, setSaving] = useState(false);
  const cardRowRef = useRef(null);

  const accountsQuery = useQuery({
    queryKey: ['accounts', 'options', { activeOnly: true }],
    queryFn: () => getAccountsRequest(token, { activeOnly: true }),
    enabled: Boolean(token),
  });
  const categoriesQuery = useQuery({
    queryKey: ['categories', 'options', { type: 'all', includeInactive: false }],
    queryFn: () => getCategoriesRequest(token),
    enabled: Boolean(token),
  });
  const accounts = accountsQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const error = actionError || accountsQuery.error?.message || categoriesQuery.error?.message || '';
  useFormErrorToast(error);

  useEffect(() => {
    const node = cardRowRef.current;
    if (!node || window.matchMedia('(min-width: 1024px)').matches) return;
    node.scrollTo({ left: node.scrollWidth, behavior: 'smooth' });
  }, [drafts.length]);

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
        subBalanceId: pocketOptions(accountById(accounts, row.accountId)).length
          ? requiredChoice(row.subBalanceId, 'Sub-balance')
          : '',
      };
    });
    setDateError(nextDateError);
    setFieldErrors(nextErrors);
    if (nextDateError || drafts.some((row) => hasErrors(nextErrors[row.key]))) return;
    setActionError('');
    setSaving(true);
    const pending = [...drafts];
    let saved = 0;
    try {
      await afterSave(async () => {
        for (const row of drafts) {
          await createTransactionRequest(
            {
              accountId: row.accountId,
              type: row.type,
              categoryId: row.categoryId,
              label: row.label,
              amount: toCentavos(row.amount),
              transactionDate: datetimeLocalToIso(transactionDate),
              subBalanceId: row.subBalanceId || undefined,
            },
            token,
          );
          saved += 1;
          pending.shift();
        }
        navigate('/transactions');
        invalidateFamilies('transactions', 'dashboard', 'accounts', 'reports');
        notify(saved === 1 ? 'Transaction saved' : `${saved} transactions saved`);
      });
    } catch (err) {
      setDrafts(pending.length ? pending : [blankRow()]);
      setActionError(saved ? `${saved} saved. ${err.message}` : err.message);
    } finally {
      setSaving(false);
    }
  };

  const dirty =
    drafts.length > 1 ||
    drafts.some((row) => row.accountId || row.categoryId || row.label.trim() || row.amount);

  return (
    <FormModal dirty={dirty} closeTo="/transactions" wide>
      <form className="space-y-4 rounded-lg border border-neutral-200 bg-neutral-0 p-4" onSubmit={onSaveAll}>
        <h1 className="pr-8 text-2xl font-semibold text-primary-shade">New transactions</h1>
        <Field label="Date and time" error={dateError}>
          <input
            className={inputClass}
            required
            type="datetime-local"
            value={transactionDate}
            onChange={(event) => setTransactionDate(event.target.value)}
          />
        </Field>
        <p className="text-sm text-neutral-500">Every entry below is saved with this date and time.</p>
        <div ref={cardRowRef} className="flex snap-x snap-mandatory overflow-x-auto lg:hidden">
          {drafts.map((row, index) => {
            const errors = fieldErrors[row.key] || {};
            const matchingCategories = categories.filter((category) => category.type === row.type);
            return (
              <article key={row.key} className="min-w-full shrink-0 snap-start space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                <p className="text-sm font-medium text-primary-shade">Entry {index + 1}</p>
                <Field label={accountLabelWithBalance('Account', accountById(accounts, row.accountId))} error={errors.accountId}>
                  <Select
                    value={row.accountId}
                    options={accounts.map((account) => ({ value: account._id, label: account.name }))}
                    onChange={(accountId) =>
                      updateDraft(row.key, { accountId, subBalanceId: pocketIdForAccount(accounts, accountId) })
                    }
                  />
                </Field>
                <SubBalanceSelect
                  account={accountById(accounts, row.accountId)}
                  value={row.subBalanceId}
                  error={errors.subBalanceId}
                  onChange={(subBalanceId) => updateDraft(row.key, { subBalanceId })}
                  label={row.type === 'INCOME' ? 'Add to' : 'Deduct from'}
                />
                <Field label="Type">
                  <Select
                    value={row.type}
                    options={transactionTypeOptions}
                    onChange={(type) => updateDraft(row.key, { type, categoryId: '' })}
                  />
                </Field>
                <Field label="Category" error={errors.categoryId}>
                  <Select
                    value={row.categoryId}
                    options={matchingCategories.map((category) => ({ value: category._id, label: category.name }))}
                    onChange={(categoryId) => updateDraft(row.key, { categoryId })}
                  />
                </Field>
                <Field label="Label" error={errors.label}>
                  <input
                    className={inputClass}
                    required
                    value={row.label}
                    onChange={(event) => updateDraft(row.key, { label: event.target.value })}
                  />
                </Field>
                <Field label="Amount (PHP)" error={errors.amount}>
                  <input
                    className={inputClass}
                    required
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={row.amount}
                    onChange={(event) => updateDraft(row.key, { amount: event.target.value })}
                  />
                </Field>
                {drafts.length > 1 ? (
                  <Button variant="ghost" onClick={() => setDrafts(drafts.filter((item) => item.key !== row.key))}>
                    Remove
                  </Button>
                ) : null}
              </article>
            );
          })}
        </div>
        <div className="hidden overflow-x-auto lg:block">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-primary text-left text-neutral-0">
                <th className="px-3 py-2 font-bold">Account</th>
                <th className="px-3 py-2 font-bold">Sub-balance</th>
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
                      <p className="mb-1 text-xs text-neutral-500">
                        {accountLabelWithBalance('Account', accountById(accounts, row.accountId))}
                      </p>
                      <Select
                        value={row.accountId}
                        options={accounts.map((account) => ({ value: account._id, label: account.name }))}
                        onChange={(accountId) =>
                          updateDraft(row.key, { accountId, subBalanceId: pocketIdForAccount(accounts, accountId) })
                        }
                      />
                      {errors.accountId ? <p className="mt-1 text-xs text-error-foreground">{errors.accountId}</p> : null}
                    </td>
                    <td className="px-2 py-2">
                      {pocketOptions(accountById(accounts, row.accountId)).length ? (
                        <>
                          <p className="mb-1 text-xs text-neutral-500">
                            {labelWithBalance(
                              row.type === 'INCOME' ? 'Add to' : 'Deduct from',
                              pocketAmount(accountById(accounts, row.accountId), row.subBalanceId),
                            )}
                          </p>
                          <Select
                            value={row.subBalanceId}
                            options={pocketOptions(accountById(accounts, row.accountId))}
                            onChange={(subBalanceId) => updateDraft(row.key, { subBalanceId })}
                          />
                          {errors.subBalanceId ? (
                            <p className="mt-1 text-xs text-error-foreground">{errors.subBalanceId}</p>
                          ) : null}
                        </>
                      ) : (
                        <span className="text-neutral-500">—</span>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <Select
                        value={row.type}
                        options={transactionTypeOptions}
                        onChange={(type) => updateDraft(row.key, { type, categoryId: '' })}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Select
                        value={row.categoryId}
                        options={matchingCategories.map((category) => ({ value: category._id, label: category.name }))}
                        onChange={(categoryId) => updateDraft(row.key, { categoryId })}
                      />
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
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save all'}
          </Button>
        </div>
      </form>
    </FormModal>
  );
};

export default TransactionCreatePage;
