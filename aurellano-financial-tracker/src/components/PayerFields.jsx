import { Trash2 } from 'lucide-react';
import Button from './Button';
import Field, { inputClass } from './Field';
import { useConfirm } from '../hooks/useConfirm';
import { emptyPayer } from '../utils/debts';

const PayerFields = ({ rows, onChange, error }) => {
  const confirm = useConfirm();

  const updateRow = (key, patch) => {
    onChange(rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const onRemove = async (row) => {
    if (rows.length <= 2) return;
    const name = String(row.name || '').trim() || 'this payer';
    const accepted = await confirm({
      title: 'Remove payer?',
      message: `This removes ${name} from the contribution.`,
      confirmLabel: 'Delete',
      confirmVariant: 'danger',
      confirmIcon: Trash2,
    });
    if (!accepted) return;
    onChange(rows.filter((item) => item.key !== row.key));
  };

  return (
    <div className="space-y-2">
      <p className="text-sm text-neutral-500">Payers</p>
      {error ? <p className="text-xs text-error-foreground">{error}</p> : null}
      {rows.map((row, index) => (
        <div key={row.key} className="grid grid-cols-[minmax(0,1fr)_minmax(5rem,8rem)_auto] items-end gap-2">
          <Field label={index === 0 ? 'Name' : ''}>
            <input
              className={inputClass}
              value={row.name}
              onChange={(event) => updateRow(row.key, { name: event.target.value })}
            />
          </Field>
          <Field label={index === 0 ? 'Share (PHP)' : ''}>
            <input
              className={inputClass}
              type="number"
              min="0.01"
              step="0.01"
              value={row.amount}
              onChange={(event) => updateRow(row.key, { amount: event.target.value, touched: true })}
            />
          </Field>
          <Button
            variant="danger"
            className="px-2"
            icon={Trash2}
            disabled={rows.length <= 2}
            aria-label={rows.length <= 2 ? 'A contribution needs at least two payers' : `Remove ${row.name || 'payer'}`}
            onClick={() => onRemove(row)}
          />
        </div>
      ))}
      <Button variant="ghost" onClick={() => onChange([...rows, emptyPayer()])}>
        Add payer
      </Button>
    </div>
  );
};

export default PayerFields;
