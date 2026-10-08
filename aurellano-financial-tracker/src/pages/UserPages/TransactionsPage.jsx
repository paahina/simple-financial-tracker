import { Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Button, { EditLink } from '../../components/Button';
import DayEntriesModal from '../../components/DayEntriesModal';
import DayGroupList from '../../components/DayGroupList';
import { ErrorText } from '../../components/StatusMessage';
import { useAuth } from '../../hooks/useAuth';
import { useConfirm } from '../../hooks/useConfirm';
import { useToast } from '../../hooks/useToast';
import {
  deleteTransactionRequest,
  getTransactionDaysRequest,
  getTransactionsRequest,
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

const TransactionsPage = () => {
  const { token } = useAuth();
  const { notify } = useToast();
  const confirm = useConfirm();
  const [days, setDays] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [error, setError] = useState('');
  const [selectedDay, setSelectedDay] = useState(null);
  const [entries, setEntries] = useState([]);
  const [dayLoading, setDayLoading] = useState(false);

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
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-primary-shade">Transactions</h1>
        <Link className="rounded-md bg-primary px-4 py-2 text-sm text-neutral-0 hover:bg-primary-shade" to="/transactions/new">
          New transaction
        </Link>
      </div>
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
