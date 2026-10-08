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
  createTransferRequest,
  deleteTransferRequest,
  getAccountsRequest,
  getTransferDaysRequest,
  getTransfersRequest,
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

const blankTransfer = (seed = {}) => ({
  key: draftKey(),
  fromAccountId: seed.fromAccountId || '',
  toAccountId: seed.toAccountId || '',
  senderName: '',
  recipientName: '',
  amount: '',
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

const TransfersPage = () => {
  const { token } = useAuth();
  const { notify } = useToast();
  const confirm = useConfirm();
  const [days, setDays] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [accounts, setAccounts] = useState([]);
  const [activeAccounts, setActiveAccounts] = useState([]);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [drafts, setDrafts] = useState([blankTransfer()]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [entries, setEntries] = useState([]);
  const [dayLoading, setDayLoading] = useState(false);

  useEffect(() => {
    getAccountsRequest(token)
      .then((accountList) => {
        setAccounts(accountList);
        setActiveAccounts(accountList.filter((account) => account.isActive));
      })
      .catch((err) => setError(err.message));
  }, [token]);

  const load = useCallback(() => {
    setLoading(true);
    return getTransferDaysRequest(token, page + 1, pageSize)
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
      return collectPages((pageNumber) => getTransfersRequest(token, pageNumber, 100, range))
        .then(setEntries)
        .catch((err) => setError(err.message))
        .finally(() => setDayLoading(false));
    },
    [token],
  );

  useEffect(() => {
    if (selectedDay) loadEntries(selectedDay.date);
  }, [selectedDay, loadEntries]);

  const nameOf = (accountId) => accounts.find((account) => account._id === accountId)?.name || 'Account';
  const sourceOf = (item) => (item.senderName ? `other: ${item.senderName}` : nameOf(item.fromAccountId));
  const destinationOf = (item) => (item.recipientName ? `other: ${item.recipientName}` : nameOf(item.toAccountId));

  const updateDraft = (key, patch) => {
    setDrafts((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const transferBody = (values) => ({
    fromAccountId: values.fromAccountId === 'other' ? null : values.fromAccountId,
    senderName: values.fromAccountId === 'other' ? values.senderName.trim() : '',
    toAccountId: values.toAccountId === 'other' ? null : values.toAccountId,
    recipientName: values.toAccountId === 'other' ? values.recipientName.trim() : '',
    amount: toCentavos(values.amount),
    transactionDate: datetimeLocalToIso(values.transactionDate),
  });

  const onCreate = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    let formError = '';
    drafts.forEach((row) => {
      nextErrors[row.key] = {
        fromAccountId: requiredChoice(row.fromAccountId, 'From'),
        toAccountId: requiredChoice(row.toAccountId, 'To'),
        senderName: row.fromAccountId === 'other' ? requiredText(row.senderName, 'Sender', 2) : '',
        recipientName: row.toAccountId === 'other' ? requiredText(row.recipientName, 'Recipient', 2) : '',
        amount: requiredAmount(row.amount),
        transactionDate: requiredChoice(row.transactionDate, 'Date'),
      };
      if (row.fromAccountId === 'other' && row.toAccountId === 'other') {
        formError = 'One side must be one of your accounts';
      }
    });
    setFieldErrors(nextErrors);
    if (formError || drafts.some((row) => hasErrors(nextErrors[row.key]))) {
      setError(formError);
      return;
    }
    setError('');
    const pending = [...drafts];
    let saved = 0;
    for (const row of drafts) {
      try {
        await createTransferRequest(transferBody(row), token);
        saved += 1;
        pending.shift();
      } catch (err) {
        setDrafts(pending.length ? pending : [blankTransfer()]);
        setError(saved ? `${saved} saved. ${err.message}` : err.message);
        await load();
        return;
      }
    }
    notify(saved === 1 ? 'Transfer saved' : `${saved} transfers saved`);
    setDrafts([blankTransfer()]);
    setFieldErrors({});
    await load();
  };

  const onDelete = async (transferId) => {
    const accepted = await confirm({
      title: 'Delete transfer?',
      message: 'This removes the transfer and puts the money back where it came from.',
      confirmLabel: 'Delete',
      confirmVariant: 'danger',
      confirmIcon: Trash2,
    });
    if (!accepted) return;
    try {
      await deleteTransferRequest(transferId, token);
      notify('Transfer deleted');
      const remaining = entries.filter((item) => item._id !== transferId);
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
        <h1 className="mb-4 text-2xl font-semibold text-primary-shade">Transfers</h1>
        <p className="mb-4 text-sm text-neutral-500">
          Moving money between your accounts, in from someone else, or out to someone else, is not income or an expense.
        </p>
        <ErrorText message={error} />
        <DayGroupList
          days={days}
          loading={loading}
          page={page}
          pageSize={pageSize}
          total={total}
          amountLabel="Total"
          emptyLabel="No transfers yet."
          onOpen={setSelectedDay}
          onPageChange={(nextPage, nextSize) => {
            setPage(nextPage);
            setPageSize(nextSize);
          }}
        />
      </div>
      <form className="h-fit space-y-4 rounded-lg border border-neutral-200 bg-neutral-0 p-4" onSubmit={onCreate}>
        <h2 className="text-lg text-primary">Move money</h2>
        {drafts.map((row, index) => {
          const errors = fieldErrors[row.key] || {};
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
              <Field label="From" error={errors.fromAccountId}>
                <select className={inputClass} required value={row.fromAccountId} onChange={(event) => updateDraft(row.key, { fromAccountId: event.target.value })}>
                  <option value="">Select</option>
                  {activeAccounts.map((account) => (
                    <option key={account._id} value={account._id}>{account.name}</option>
                  ))}
                  <option value="other">From other</option>
                </select>
              </Field>
              {row.fromAccountId === 'other' && (
                <Field label="Sender" error={errors.senderName}>
                  <input className={inputClass} required minLength={2} value={row.senderName} onChange={(event) => updateDraft(row.key, { senderName: event.target.value })} />
                </Field>
              )}
              <Field label="To" error={errors.toAccountId}>
                <select className={inputClass} required value={row.toAccountId} onChange={(event) => updateDraft(row.key, { toAccountId: event.target.value })}>
                  <option value="">Select</option>
                  {activeAccounts.map((account) => (
                    <option key={account._id} value={account._id}>{account.name}</option>
                  ))}
                  <option value="other">To other</option>
                </select>
              </Field>
              {row.toAccountId === 'other' && (
                <Field label="Recipient" error={errors.recipientName}>
                  <input className={inputClass} required minLength={2} value={row.recipientName} onChange={(event) => updateDraft(row.key, { recipientName: event.target.value })} />
                </Field>
              )}
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
          <Button
            variant="ghost"
            onClick={() =>
              setDrafts([
                ...drafts,
                blankTransfer({
                  fromAccountId: drafts[drafts.length - 1].fromAccountId,
                  toAccountId: drafts[drafts.length - 1].toAccountId,
                }),
              ])
            }
          >
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
                  {sourceOf(item)} to {destinationOf(item)}
                  <span className="ml-2 text-neutral-500">{formatDateTime(item.transactionDate)}</span>
                </span>
                <span className="flex items-center gap-3">
                  {formatPeso(item.amount)}
                  <EditLink to={`/transfers/${item._id}/edit`}>Edit</EditLink>
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

export default TransfersPage;
