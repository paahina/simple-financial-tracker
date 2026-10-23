import { Trash2 } from 'lucide-react';
import Button from './Button';
import Field, { inputClass } from './Field';
import { useConfirm } from '../hooks/useConfirm';
const DEBT_CATEGORY_SUGGESTIONS = ['Food', 'Rent', 'Utilities', 'Other'];

const rowKey = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;

export const emptyDebtCategoryRow = (seed = {}) => ({
  key: seed.key || rowKey(),
  _id: seed._id,
  label: seed.label || '',
  amount: seed.amount || '',
  dueDate: seed.dueDate || '',
});

const DebtCategoryFields = ({ rows, onChange, error }) => {
  const confirm = useConfirm();

  const updateRow = (key, patch) => {
    onChange(rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const onRemove = async (row) => {
    if (rows.length === 1) return;
    const name = String(row.label || '').trim() || 'this category';
    const accepted = await confirm({
      title: 'Remove category?',
      message: `This removes ${name} from the debt.`,
      confirmLabel: 'Delete',
      confirmVariant: 'danger',
      confirmIcon: Trash2,
    });
    if (!accepted) return;
    onChange(rows.filter((item) => item.key !== row.key));
  };

  return (
    <div className="space-y-2">
      <p className="text-sm text-neutral-500">Categories</p>
      {error ? <p className="text-xs text-error-foreground">{error}</p> : null}
      <datalist id="debt-category-suggestions">
        {DEBT_CATEGORY_SUGGESTIONS.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      {rows.map((row, index) => (
        <div
          key={row.key}
          className="grid grid-cols-[minmax(0,1fr)_minmax(5rem,7rem)_minmax(7rem,9rem)_auto] items-end gap-2"
        >
          <Field label={index === 0 ? 'Label' : ''}>
            <input
              className={inputClass}
              list="debt-category-suggestions"
              value={row.label}
              onChange={(event) => updateRow(row.key, { label: event.target.value })}
            />
          </Field>
          <Field label={index === 0 ? 'Amount (PHP)' : ''}>
            <input
              className={inputClass}
              type="number"
              min="0.01"
              step="0.01"
              value={row.amount}
              onChange={(event) => updateRow(row.key, { amount: event.target.value })}
            />
          </Field>
          <Field label={index === 0 ? 'Due date' : ''}>
            <input
              className={inputClass}
              type="date"
              value={row.dueDate}
              onChange={(event) => updateRow(row.key, { dueDate: event.target.value })}
            />
          </Field>
          <Button
            variant="danger"
            className="px-2"
            icon={Trash2}
            disabled={rows.length === 1}
            aria-label={rows.length === 1 ? 'Cannot remove the last category' : `Remove ${row.label || 'category'}`}
            onClick={() => onRemove(row)}
          />
        </div>
      ))}
      <Button variant="ghost" onClick={() => onChange([...rows, emptyDebtCategoryRow()])}>
        Add category
      </Button>
    </div>
  );
};

export default DebtCategoryFields;
