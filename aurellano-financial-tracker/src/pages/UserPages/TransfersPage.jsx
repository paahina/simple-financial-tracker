import { Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Button, { EditLink } from '../../components/Button';
import DayGroupList from '../../components/DayGroupList';
import { Empty, ErrorText, Loading } from '../../components/StatusMessage';
import { useAuth } from '../../hooks/useAuth';
import { useConfirm } from '../../hooks/useConfirm';
import { useToast } from '../../hooks/useToast';
import {
  deleteTransferRequest,
  getAccountsRequest,
  getTransferDaysRequest,
  getTransfersRequest,
} from '../../services/api';
import { formatDateTime, formatDayKey, formatPeso, localDayBoundsIso } from '../../utils/format';

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
  const [error, setError] = useState('');
  const [selectedDay, setSelectedDay] = useState(null);
  const [entries, setEntries] = useState([]);
  const [dayLoading, setDayLoading] = useState(false);

  useEffect(() => {
    getAccountsRequest(token)
      .then(setAccounts)
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

  useEffect(() => {
    setSelectedDay((current) => {
      if (!days.length) return null;
      return days.find((day) => day.date === current?.date) || days[0];
    });
  }, [days]);

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
  const destinationOf = (item) =>
    item.recipientName ? `other: ${item.recipientName}` : nameOf(item.toAccountId);

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
      if (!remaining.length && days.length === 1 && page > 0) {
        setEntries([]);
        setPage((current) => current - 1);
        return;
      }
      setEntries(remaining);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-primary-shade">Transfers</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Moving money between your accounts, in from someone else, or out to someone else, is not income or an expense.
        </p>
      </div>
      <ErrorText message={error} />
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <DayGroupList
          days={days}
          loading={loading}
          page={page}
          pageSize={pageSize}
          total={total}
          selectedDate={selectedDay?.date}
          emptyLabel="No transfers yet."
          onSelect={setSelectedDay}
          onPageChange={(nextPage, nextSize) => {
            setPage(nextPage);
            setPageSize(nextSize);
          }}
        />
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-primary-shade">
              {selectedDay ? formatDayKey(selectedDay.date) : 'Entries'}
            </h2>
            <Link className="rounded-md bg-primary px-4 py-2 text-sm text-neutral-0 hover:bg-primary-shade" to="/transfers/new">
              New transfer
            </Link>
          </div>
          {dayLoading && <Loading variant="list" />}
          {!dayLoading && selectedDay && entries.length === 0 && <Empty label="No entries on this day." />}
          {!dayLoading && entries.length > 0 && (
            <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-neutral-0">
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
          )}
        </div>
      </div>
    </section>
  );
};

export default TransfersPage;
