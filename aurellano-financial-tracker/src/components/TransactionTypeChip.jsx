const tones = {
  INCOME: 'bg-edit-tint text-edit',
  EXPENSE: 'bg-warning-tint text-warning',
};

const labels = {
  INCOME: 'Income',
  EXPENSE: 'Expense',
};

const TransactionTypeChip = ({ type }) => (
  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tones[type] || tones.EXPENSE}`}>
    {labels[type] || type}
  </span>
);

export const transactionTypeOptions = [
  { value: 'EXPENSE', label: <TransactionTypeChip type="EXPENSE" /> },
  { value: 'INCOME', label: <TransactionTypeChip type="INCOME" /> },
];

export default TransactionTypeChip;
