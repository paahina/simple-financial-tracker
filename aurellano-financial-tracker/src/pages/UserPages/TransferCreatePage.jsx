import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button, { editLinkClass } from '../../components/Button';
import Field, { inputClass } from '../../components/Field';
import Select from '../../components/Select';
import { ErrorText } from '../../components/StatusMessage';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { createTransferRequest, getAccountsRequest } from '../../services/api';
import { datetimeLocalToIso, nowDatetimeLocal, toCentavos } from '../../utils/format';
import { hasErrors, requiredAmount, requiredChoice, requiredText } from '../../utils/validate';

const draftKey = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;

const blankRow = (seed = {}) => ({
  key: draftKey(),
  fromAccountId: seed.fromAccountId || '',
  toAccountId: seed.toAccountId || '',
  senderName: '',
  recipientName: '',
  amount: '',
});

const TransferCreatePage = () => {
  const { token } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [activeAccounts, setActiveAccounts] = useState([]);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [dateError, setDateError] = useState('');
  const [transactionDate, setTransactionDate] = useState(nowDatetimeLocal());
  const [drafts, setDrafts] = useState([blankRow()]);
  const [saving, setSaving] = useState(false);
  const cardRowRef = useRef(null);

  useEffect(() => {
    getAccountsRequest(token, { activeOnly: true })
      .then(setActiveAccounts)
      .catch((err) => setError(err.message));
  }, [token]);

  useEffect(() => {
    const node = cardRowRef.current;
    if (!node || window.matchMedia('(min-width: 1024px)').matches) return;
    node.scrollTo({ left: node.scrollWidth, behavior: 'smooth' });
  }, [drafts.length]);

  const updateDraft = (key, patch) => {
    setDrafts((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const transferBody = (values) => ({
    fromAccountId: values.fromAccountId === 'other' ? null : values.fromAccountId,
    senderName: values.fromAccountId === 'other' ? values.senderName.trim() : '',
    toAccountId: values.toAccountId === 'other' ? null : values.toAccountId,
    recipientName: values.toAccountId === 'other' ? values.recipientName.trim() : '',
    amount: toCentavos(values.amount),
    transactionDate: datetimeLocalToIso(transactionDate),
  });

  const onSaveAll = async (event) => {
    event.preventDefault();
    const nextDateError = requiredChoice(transactionDate, 'Date');
    const nextErrors = {};
    let formError = '';
    drafts.forEach((row) => {
      nextErrors[row.key] = {
        fromAccountId: requiredChoice(row.fromAccountId, 'From'),
        toAccountId: requiredChoice(row.toAccountId, 'To'),
        senderName: row.fromAccountId === 'other' ? requiredText(row.senderName, 'Sender', 2) : '',
        recipientName: row.toAccountId === 'other' ? requiredText(row.recipientName, 'Recipient', 2) : '',
        amount: requiredAmount(row.amount),
      };
      if (row.fromAccountId === 'other' && row.toAccountId === 'other') {
        formError = 'One side must be one of your accounts';
      }
    });
    setDateError(nextDateError);
    setFieldErrors(nextErrors);
    if (nextDateError || formError || drafts.some((row) => hasErrors(nextErrors[row.key]))) {
      setError(formError);
      return;
    }
    setError('');
    setSaving(true);
    const pending = [...drafts];
    let saved = 0;
    try {
      for (const row of drafts) {
        await createTransferRequest(transferBody(row), token);
        saved += 1;
        pending.shift();
      }
      notify(saved === 1 ? 'Transfer saved' : `${saved} transfers saved`);
      navigate('/transfers');
    } catch (err) {
      setDrafts(pending.length ? pending : [blankRow()]);
      setError(saved ? `${saved} saved. ${err.message}` : err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-4">
      <Link className={`text-sm ${editLinkClass}`} to="/transfers">
        Back to transfers
      </Link>
      <h1 className="text-2xl font-semibold text-primary-shade">New transfers</h1>
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
        <p className="text-sm text-neutral-500">Every entry below is saved with this date and time.</p>
        <div ref={cardRowRef} className="flex snap-x snap-mandatory overflow-x-auto lg:hidden">
          {drafts.map((row, index) => {
            const errors = fieldErrors[row.key] || {};
            return (
              <article key={row.key} className="min-w-full shrink-0 snap-start space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                <p className="text-sm font-medium text-primary-shade">Entry {index + 1}</p>
                <Field label="From" error={errors.fromAccountId}>
                  <Select
                    value={row.fromAccountId}
                    options={[
                      ...activeAccounts.map((account) => ({ value: account._id, label: account.name })),
                      { value: 'other', label: 'From other' },
                    ]}
                    onChange={(fromAccountId) => updateDraft(row.key, { fromAccountId })}
                  />
                </Field>
                {row.fromAccountId === 'other' ? (
                  <Field label="Sender" error={errors.senderName}>
                    <input
                      className={inputClass}
                      required
                      minLength={2}
                      value={row.senderName}
                      onChange={(event) => updateDraft(row.key, { senderName: event.target.value })}
                    />
                  </Field>
                ) : null}
                <Field label="To" error={errors.toAccountId}>
                  <Select
                    value={row.toAccountId}
                    options={[
                      ...activeAccounts.map((account) => ({ value: account._id, label: account.name })),
                      { value: 'other', label: 'To other' },
                    ]}
                    onChange={(toAccountId) => updateDraft(row.key, { toAccountId })}
                  />
                </Field>
                {row.toAccountId === 'other' ? (
                  <Field label="Recipient" error={errors.recipientName}>
                    <input
                      className={inputClass}
                      required
                      minLength={2}
                      value={row.recipientName}
                      onChange={(event) => updateDraft(row.key, { recipientName: event.target.value })}
                    />
                  </Field>
                ) : null}
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
                <th className="px-3 py-2 font-bold">From</th>
                <th className="px-3 py-2 font-bold">To</th>
                <th className="px-3 py-2 font-bold">Amount</th>
                <th className="px-3 py-2 font-bold" />
              </tr>
            </thead>
            <tbody>
              {drafts.map((row) => {
                const errors = fieldErrors[row.key] || {};
                return (
                  <tr key={row.key} className="border-b border-neutral-200 align-top">
                    <td className="space-y-2 px-2 py-2">
                      <Select
                        value={row.fromAccountId}
                        options={[
                          ...activeAccounts.map((account) => ({ value: account._id, label: account.name })),
                          { value: 'other', label: 'From other' },
                        ]}
                        onChange={(fromAccountId) => updateDraft(row.key, { fromAccountId })}
                      />
                      {errors.fromAccountId ? (
                        <p className="text-xs text-error-foreground">{errors.fromAccountId}</p>
                      ) : null}
                      {row.fromAccountId === 'other' ? (
                        <>
                          <input
                            className={inputClass}
                            placeholder="Sender"
                            required
                            minLength={2}
                            value={row.senderName}
                            onChange={(event) => updateDraft(row.key, { senderName: event.target.value })}
                          />
                          {errors.senderName ? (
                            <p className="text-xs text-error-foreground">{errors.senderName}</p>
                          ) : null}
                        </>
                      ) : null}
                    </td>
                    <td className="space-y-2 px-2 py-2">
                      <Select
                        value={row.toAccountId}
                        options={[
                          ...activeAccounts.map((account) => ({ value: account._id, label: account.name })),
                          { value: 'other', label: 'To other' },
                        ]}
                        onChange={(toAccountId) => updateDraft(row.key, { toAccountId })}
                      />
                      {errors.toAccountId ? <p className="text-xs text-error-foreground">{errors.toAccountId}</p> : null}
                      {row.toAccountId === 'other' ? (
                        <>
                          <input
                            className={inputClass}
                            placeholder="Recipient"
                            required
                            minLength={2}
                            value={row.recipientName}
                            onChange={(event) => updateDraft(row.key, { recipientName: event.target.value })}
                          />
                          {errors.recipientName ? (
                            <p className="text-xs text-error-foreground">{errors.recipientName}</p>
                          ) : null}
                        </>
                      ) : null}
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
                  fromAccountId: drafts[drafts.length - 1].fromAccountId,
                  toAccountId: drafts[drafts.length - 1].toAccountId,
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

export default TransferCreatePage;
