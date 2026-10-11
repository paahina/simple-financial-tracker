import Button from './Button';
import Field, { inputClass } from './Field';

const rowKey = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;

export const emptySubBalanceRow = (seed = {}) => ({
  key: seed.key || rowKey(),
  _id: seed._id,
  label: seed.label || '',
  amount: seed.amount || '',
});

const SubBalanceFields = ({ rows, onChange, error }) => {
  const updateRow = (key, patch) => {
    onChange(rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  return (
    <div className="space-y-2">
      <p className="text-sm text-neutral-500">Sub-balances</p>
      {error ? <p className="text-xs text-error-foreground">{error}</p> : null}
      {rows.map((row, index) => (
        <div key={row.key} className="grid gap-2 sm:grid-cols-[1fr_8rem_auto]">
          <Field label={index === 0 ? 'Label' : ''}>
            <input
              className={inputClass}
              value={row.label}
              onChange={(event) => updateRow(row.key, { label: event.target.value })}
            />
          </Field>
          <Field label={index === 0 ? 'Amount (PHP)' : ''}>
            <input
              className={inputClass}
              type="number"
              min="0"
              step="0.01"
              value={row.amount}
              onChange={(event) => updateRow(row.key, { amount: event.target.value })}
            />
          </Field>
          <div className={index === 0 ? 'flex items-end' : ''}>
            <Button
              variant="ghost"
              disabled={rows.length === 1}
              onClick={() => onChange(rows.filter((item) => item.key !== row.key))}
            >
              Remove
            </Button>
          </div>
        </div>
      ))}
      <Button variant="ghost" onClick={() => onChange([...rows, emptySubBalanceRow()])}>
        Add sub-balance
      </Button>
    </div>
  );
};

export default SubBalanceFields;
