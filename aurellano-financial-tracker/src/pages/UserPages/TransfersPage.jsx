import { useQuery } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Button, { EditLink } from '../../components/Button';
import DayGroupList from '../../components/DayGroupList';
import DayListDrawer from '../../components/DayListDrawer';
import Pager from '../../components/Pager';
import { Empty, ErrorText, Loading } from '../../components/StatusMessage';
import { useAuth } from '../../hooks/useAuth';
import { afterSave, invalidateFamilies } from '../../query/cache';
import { useConfirm } from '../../hooks/useConfirm';
import { useToast } from '../../hooks/useToast';
import {
  deleteTransferRequest,
  getAccountsRequest,
  getTransferDaysRequest,
  getTransfersRequest,
} from '../../services/api';
import { formatDateTime, formatDayKey, formatPeso, localDayBoundsIso } from '../../utils/format';

const TransfersPage = () => {
  const location = useLocation();
  const { token } = useAuth();
  const { notify } = useToast();
  const confirm = useConfirm();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [actionError, setActionError] = useState('');
  const [selectedDay, setSelectedDay] = useState(null);
  const [entryPage, setEntryPage] = useState(0);
  const [entryPageSize, setEntryPageSize] = useState(10);
  const [daysOpen, setDaysOpen] = useState(false);
  const accountsQuery = useQuery({
    queryKey: ['accounts', 'options', { activeOnly: false }],
    queryFn: () => getAccountsRequest(token),
    enabled: Boolean(token),
  });
  const daysQuery = useQuery({
    queryKey: ['transfers', 'days', { page, pageSize }],
    queryFn: () => getTransferDaysRequest(token, page + 1, pageSize),
    enabled: Boolean(token),
  });
  const accounts = accountsQuery.data ?? [];
  const days = daysQuery.data?.data ?? [];
  const total = daysQuery.data?.total ?? 0;
  const loading = daysQuery.isPending;

  useEffect(() => {
    setSelectedDay((current) => {
      if (!days.length) return null;
      return days.find((day) => day.date === current?.date) || days[0];
    });
  }, [days]);

  const entriesQuery = useQuery({
    queryKey: ['transfers', 'entries', { date: selectedDay?.date, entryPage, entryPageSize }],
    queryFn: () => getTransfersRequest(token, entryPage + 1, entryPageSize, localDayBoundsIso(selectedDay.date)),
    enabled: Boolean(token && selectedDay),
  });
  const entries = entriesQuery.data?.data ?? [];
  const entryTotal = entriesQuery.data?.total ?? 0;
  const dayLoading = Boolean(selectedDay) && entriesQuery.isPending;
  const error = actionError || accountsQuery.error?.message || daysQuery.error?.message || entriesQuery.error?.message || '';

  useEffect(() => {
    setEntryPage(0);
  }, [selectedDay?.date]);

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
      await afterSave(async () => {
        await deleteTransferRequest(transferId, token);
        invalidateFamilies('transfers', 'dashboard', 'accounts');
        notify('Transfer deleted');
        if (entries.length === 1 && days.length === 1 && page > 0) {
          setPage((current) => current - 1);
          return;
        }
        if (entries.length === 1 && entryPage > 0) setEntryPage((current) => current - 1);
      });
    } catch (err) {
      setActionError(err.message);
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
        <div className="hidden lg:block">
          <DayGroupList
            days={days}
            loading={loading}
            page={page}
            pageSize={pageSize}
            total={total}
            selectedDate={selectedDay?.date}
            emptyLabel="No transfers yet."
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
            <Link
              className="rounded-md bg-primary px-4 py-2 text-sm text-neutral-0 hover:bg-primary-shade"
              to="/transfers/new"
              state={{ backgroundLocation: location }}
            >
              New transfer
            </Link>
          </div>
          {dayLoading && <Loading variant="entries" />}
          {!dayLoading && selectedDay && entries.length === 0 && <Empty label="No entries on this day." />}
          {!dayLoading && entries.length > 0 && (
            <ul className="space-y-3 lg:space-y-0 lg:divide-y lg:divide-neutral-200 lg:overflow-hidden lg:rounded-lg lg:border lg:border-neutral-200 lg:bg-neutral-0">
              {entries.map((item) => (
                <li key={item._id} className="rounded-lg border border-neutral-200 bg-neutral-0 p-4 text-sm lg:flex lg:items-center lg:justify-between lg:gap-3 lg:rounded-none lg:border-0 lg:px-4 lg:py-3">
                  <div className="min-w-0">
                    <div className="flex items-start justify-between gap-3 lg:block">
                      <span>
                        {sourceOf(item)} to {destinationOf(item)}
                        <span className="mt-1 block text-neutral-500 lg:ml-2 lg:mt-0 lg:inline">
                          {formatDateTime(item.transactionDate)}
                        </span>
                      </span>
                      <span className="shrink-0 font-medium lg:hidden">{formatPeso(item.amount)}</span>
                    </div>
                  </div>
                  <span className="mt-3 flex flex-wrap items-center gap-3 lg:mt-0">
                    <span className="hidden lg:inline">{formatPeso(item.amount)}</span>
                    <EditLink to={`/transfers/${item._id}/edit`}>Edit</EditLink>
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
          emptyLabel="No transfers yet."
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

export default TransfersPage;
