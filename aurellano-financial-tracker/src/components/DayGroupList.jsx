import { Empty, Loading } from './StatusMessage';
import { formatDayKey, formatPeso } from '../utils/format';

const AmountChip = ({ tone, amount }) => (
  <span
    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
      tone === 'added' ? 'bg-success-tint text-success' : 'bg-destructive-tint text-destructive-shade'
    }`}
  >
    {tone === 'added' ? '+' : '-'}
    {formatPeso(amount)}
  </span>
);

const DayGroupList = ({
  days,
  loading,
  page,
  pageSize,
  total,
  onPageChange,
  selectedDate,
  onSelect,
  emptyLabel,
}) => {
  if (loading) return <Loading variant="list" />;
  if (!days.length) return <Empty label={emptyLabel} />;

  const from = page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);
  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="space-y-3">
      <ul className="overflow-hidden rounded-lg border border-neutral-200 bg-neutral-0">
        {days.map((day) => {
          const selected = day.date === selectedDate;
          return (
            <li key={day.date} className="border-b border-neutral-200 last:border-b-0">
              <button
                type="button"
                className={`flex w-full flex-col gap-2 px-3 py-3 text-left ${selected ? 'bg-neutral-200' : 'hover:bg-neutral-50'}`}
                aria-current={selected ? 'true' : undefined}
                onClick={() => onSelect(day)}
              >
                <span className="text-sm font-medium text-primary-shade">{formatDayKey(day.date)}</span>
                <span className="text-xs text-neutral-500">
                  {day.count} {day.count === 1 ? 'entry' : 'entries'}
                </span>
                <span className="flex flex-wrap gap-1">
                  {day.addedAmount > 0 ? <AmountChip tone="added" amount={day.addedAmount} /> : null}
                  {day.deductedAmount > 0 ? <AmountChip tone="deducted" amount={day.deductedAmount} /> : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="space-y-2 text-sm text-neutral-500">
        <label className="flex items-center gap-2">
          Days
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
        <div className="flex items-center justify-between gap-2">
          <span>
            {from}–{to} of {total}
          </span>
          <span className="flex gap-2">
            <button
              type="button"
              className="rounded-md border border-neutral-200 px-2 py-1 disabled:opacity-40"
              disabled={page === 0}
              onClick={() => onPageChange(page - 1, pageSize)}
            >
              Prev
            </button>
            <button
              type="button"
              className="rounded-md border border-neutral-200 px-2 py-1 disabled:opacity-40"
              disabled={page + 1 >= totalPages}
              onClick={() => onPageChange(page + 1, pageSize)}
            >
              Next
            </button>
          </span>
        </div>
      </div>
    </div>
  );
};

export default DayGroupList;
