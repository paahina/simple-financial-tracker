const chipClass = {
  PENDING: 'bg-neutral-200 text-primary',
  PARTIALLY_PAID: 'bg-warning-tint text-warning',
  PAID: 'bg-success-tint text-success',
  OVERDUE: 'bg-destructive-tint text-destructive-shade',
};

const chipLabel = {
  PENDING: 'Pending',
  PARTIALLY_PAID: 'Partially paid',
  PAID: 'Paid',
  OVERDUE: 'Overdue',
};

const StatusChip = ({ status }) => (
  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${chipClass[status] || chipClass.PENDING}`}>
    {chipLabel[status] || status}
  </span>
);

export default StatusChip;
