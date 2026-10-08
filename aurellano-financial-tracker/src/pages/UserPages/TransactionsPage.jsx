import { Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Button, { EditLink } from '../../components/Button';
import DayGroupList from '../../components/DayGroupList';
import DayListDrawer from '../../components/DayListDrawer';
import Pager from '../../components/Pager';
import { Empty, ErrorText, Loading } from '../../components/StatusMessage';
import { useAuth } from '../../hooks/useAuth';
import { useConfirm } from '../../hooks/useConfirm';
import { useToast } from '../../hooks/useToast';
import {
  deleteTransactionRequest,
  getTransactionDaysRequest,
  getTransactionsRequest,
} from '../../services/api';
import { formatDateTime, formatDayKey, formatPeso, localDayBoundsIso } from '../../utils/format';

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
  const [entryTotal, setEntryTotal] = useState(0);
  const [entryPage, setEntryPage] = useState(0);
  const [entryPageSize, setEntryPageSize] = useState(10);
  const [dayLoading, setDayLoading] = useState(false);
  const [daysOpen, setDaysOpen] = useState(false);

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
      return getTransactionsRequest(token, entryPage + 1, entryPageSize, range)
        .then((result) => {
          setEntries(result.data);
          setEntryTotal(result.total);
        })
        .catch((err) => setError(err.message))
        .finally(() => setDayLoading(false));
    },
    [token, entryPage, entryPageSize],
  );

  useEffect(() => {
    setEntryPage(0);
  }, [selectedDay?.date]);

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
      if (entries.length === 1 && days.length === 1 && page > 0) {
        setEntries([]);
        setEntryTotal(0);
        setPage((current) => current - 1);
        return;
      }
      if (entries.length === 1 && entryPage > 0) {
        setEntryPage((current) => current - 1);
      } else if (selectedDay) {
        await loadEntries(selectedDay.date);
      }
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold text-primary-shade">Transactions</h1>
      <ErrorText message={error} />
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="hidden lg:block">
          <DayGroupList
            days={days}
            loading={loading}
            page={page}
            pageSize={pageSize}
            total={total}
            selectedDate={selectedDay?.date}
            emptyLabel="No income or expenses yet."
            onSelect={(day) => {
              if (day.date !== selectedDay?.date) setEntryPage(0);
              setSelectedDay(day);
            }}
            onPageChange={(nextPage, nextSize) => {
              setPage(nextPage);
              setPageSize(nextSize);
            }}
          />
        </div>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <Button variant="ghost" className="lg:hidden" onClick={() => setDaysOpen(true)}>
                Days
              </Button>
              <h2 className="truncate text-lg font-semibold text-primary-shade">
                {selectedDay ? formatDayKey(selectedDay.date) : 'Entries'}
              </h2>
            </div>
            <Link className="rounded-md bg-primary px-4 py-2 text-sm text-neutral-0 hover:bg-primary-shade" to="/transactions/new">
              New transaction
            </Link>
          </div>
          {dayLoading && <Loading variant="list" />}
          {!dayLoading && selectedDay && entries.length === 0 && <Empty label="No entries on this day." />}
          {!dayLoading && entries.length > 0 && (
            <ul className="space-y-3 lg:space-y-0 lg:divide-y lg:divide-neutral-200 lg:overflow-hidden lg:rounded-lg lg:border lg:border-neutral-200 lg:bg-neutral-0">
              {entries.map((item) => (
                <li key={item._id} className="rounded-lg border border-neutral-200 bg-neutral-0 p-4 text-sm lg:flex lg:items-center lg:justify-between lg:gap-3 lg:rounded-none lg:border-0 lg:px-4 lg:py-3">
                  <div className="min-w-0">
                    <div className="flex items-start justify-between gap-3 lg:block">
                      <span>
                        {item.label}
                        <span className="mt-1 block text-neutral-500 lg:ml-2 lg:mt-0 lg:inline">
                          {item.type} · {formatDateTime(item.transactionDate)}
                        </span>
                      </span>
                      <span className="shrink-0 font-medium lg:hidden">{formatPeso(item.amount)}</span>
                    </div>
                  </div>
                  <span className="mt-3 flex flex-wrap items-center gap-3 lg:mt-0">
                    <span className="hidden lg:inline">{formatPeso(item.amount)}</span>
                    <EditLink to={`/transactions/${item._id}/edit`}>Edit</EditLink>
                    <Button variant="danger" icon={Trash2} onClick={() => onDelete(item._id)}>
                      Delete
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Pager
            page={entryPage}
            pageSize={entryPageSize}
            total={entryTotal}
            label="Entries"
            onPageChange={(nextPage, nextSize) => {
              setEntryPage(nextPage);
              setEntryPageSize(nextSize);
            }}
          />
        </div>
      </div>
      <DayListDrawer open={daysOpen} onClose={() => setDaysOpen(false)}>
        <DayGroupList
          days={days}
          loading={loading}
          page={page}
          pageSize={pageSize}
          total={total}
          selectedDate={selectedDay?.date}
          emptyLabel="No income or expenses yet."
          onSelect={(day) => {
            if (day.date !== selectedDay?.date) setEntryPage(0);
            setSelectedDay(day);
          }}
          onPageChange={(nextPage, nextSize) => {
            setPage(nextPage);
            setPageSize(nextSize);
          }}
        />
      </DayListDrawer>
    </section>
  );
};

export default TransactionsPage;
