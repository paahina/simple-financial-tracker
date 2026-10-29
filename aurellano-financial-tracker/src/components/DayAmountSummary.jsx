import Money from './Money';
import { formatPeso } from '../utils/format';

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

const DayAmountSummary = ({
  addedAmount = 0,
  deductedAmount = 0,
  className = '',
  variant = 'chips',
  addedLabel = 'Added',
  deductedLabel = 'Deducted',
}) => {
  if (variant === 'cards') {
    return (
      <div className={`grid grid-cols-2 gap-4 ${className}`.trim()}>
        <article className="rounded-lg border border-neutral-200 bg-neutral-0 p-4">
          <p className="text-sm text-neutral-500">{addedLabel}</p>
          <Money className="mt-2 block text-xl font-semibold text-success" centavos={addedAmount} />
        </article>
        <article className="rounded-lg border border-neutral-200 bg-neutral-0 p-4">
          <p className="text-sm text-neutral-500">{deductedLabel}</p>
          <Money className="mt-2 block text-xl font-semibold text-destructive-shade" centavos={deductedAmount} />
        </article>
      </div>
    );
  }

  if (addedAmount <= 0 && deductedAmount <= 0) return null;
  return (
    <div className={`flex flex-wrap gap-2 ${className}`.trim()}>
      {addedAmount > 0 ? <AmountChip tone="added" amount={addedAmount} /> : null}
      {deductedAmount > 0 ? <AmountChip tone="deducted" amount={deductedAmount} /> : null}
    </div>
  );
};

export default DayAmountSummary;
