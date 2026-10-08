import { Empty, Loading } from './StatusMessage';
import { formatDayKey, formatPeso } from '../utils/format';

const DayGroupList = ({
  days,
  loading,
  page,
  pageSize,
  total,
  onPageChange,
  onOpen,
  emptyLabel,
  amountLabel,
}) => {
  if (loading) return <Loading variant="list" />;
  if (!days.length) return <Empty label={emptyLabel} />;

  const from = page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);
  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="space-y-3">
      <ul className="space-y-3">
        {days.map((day) => (
          <li key={day.date}>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-neutral-0 p-4 text-left hover:bg-neutral-50"
              onClick={() => onOpen(day)}
            >
              <span>
                <span className="block font-medium text-primary-shade">{formatDayKey(day.date)}</span>
                <span className="text-sm text-neutral-500">
                  {day.count} {day.count === 1 ? 'entry' : 'entries'}
                </span>
              </span>
              <span className="text-sm text-primary-shade">
                {amountLabel} {formatPeso(day.totalAmount)}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-neutral-500">
        <label className="flex items-center gap-2">
          Days per page
          <select
            className="rounded-md border border-neutral-200 bg-neutral-0 px-2 py-1"
            value={pageSize}
            onChange={(event) => onPageChange(0, Number(event.target.value))}
          >
            {[10, 20, 50].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <span>
          {from}–{to} of {total}
        </span>
        <span className="flex gap-2">
          <button
            type="button"
            className="rounded-md border border-neutral-200 px-3 py-1 disabled:opacity-40"
            disabled={page === 0}
            onClick={() => onPageChange(page - 1, pageSize)}
          >
            Previous
          </button>
          <button
            type="button"
            className="rounded-md border border-neutral-200 px-3 py-1 disabled:opacity-40"
            disabled={page + 1 >= totalPages}
            onClick={() => onPageChange(page + 1, pageSize)}
          >
            Next
          </button>
        </span>
      </div>
    </div>
  );
};

export default DayGroupList;
