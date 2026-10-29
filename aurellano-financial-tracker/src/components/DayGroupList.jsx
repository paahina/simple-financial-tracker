import Pager from './Pager';
import DayAmountSummary from './DayAmountSummary';
import { Empty, Loading } from './StatusMessage';
import { formatDayKey } from '../utils/format';

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
  if (loading) return <Loading variant="days" />;
  if (!days.length) return <Empty label={emptyLabel} />;

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
                  <DayAmountSummary addedAmount={day.addedAmount} deductedAmount={day.deductedAmount} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <Pager page={page} pageSize={pageSize} total={total} onPageChange={onPageChange} label="Days" />
    </div>
  );
};

export default DayGroupList;
