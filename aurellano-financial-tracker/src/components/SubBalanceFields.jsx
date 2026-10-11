import { Trash2 } from 'lucide-react';
import Button from './Button';
import Field, { inputClass } from './Field';
import { useConfirm } from '../hooks/useConfirm';

const rowKey = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;

export const emptySubBalanceRow = (seed = {}) => ({
  key: seed.key || rowKey(),
  _id: seed._id,
  label: seed.label || '',
  amount: seed.amount || '',
});

const SubBalanceFields = ({ rows, onChange, error }) => {
  const confirm = useConfirm();

  const updateRow = (key, patch) => {
    onChange(rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const onRemove = async (row) => {
    if (rows.length === 1) return;
    const name = String(row.label || '').trim() || 'this sub-balance';
    const accepted = await confirm({
      title: 'Remove sub-balance?',
      message: `This removes ${name} from the account.`,
      confirmLabel: 'Delete',
      confirmVariant: 'danger',
      confirmIcon: Trash2,
    });
    if (!accepted) return;
    onChange(rows.filter((item) => item.key !== row.key));
  };

  return (
    <div className="space-y-2">
      <p className="text-sm text-neutral-500">Sub-balances</p>
      {error ? <p className="text-xs text-error-foreground">{error}</p> : null}
      {rows.map((row, index) => (
        <div key={row.key} className="grid grid-cols-[minmax(0,1fr)_minmax(5rem,8rem)_auto] items-end gap-2">
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
          <Button
            variant="danger"
            className="px-2"
            icon={Trash2}
            disabled={rows.length === 1}
            aria-label={rows.length === 1 ? 'Cannot remove the last sub-balance' : `Remove ${row.label || 'sub-balance'}`}
            onClick={() => onRemove(row)}
          />
        </div>
      ))}
      <Button variant="ghost" onClick={() => onChange([...rows, emptySubBalanceRow()])}>
        Add sub-balance
      </Button>
    </div>
  );
};

export default SubBalanceFields;
