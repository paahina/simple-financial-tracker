import Select from './Select';

const Pager = ({ page, pageSize, total, onPageChange, label = 'Rows' }) => {
  if (!total) return null;
  const from = page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);
  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="space-y-2 text-sm text-neutral-500">
      <label className="flex items-center gap-2">
        {label}
        <Select
          className="w-24"
          value={pageSize}
          options={[10, 20, 50].map((size) => ({ value: size, label: String(size) }))}
          onChange={(nextSize) => onPageChange(0, Number(nextSize))}
        />
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
  );
};

export default Pager;
