const tones = {
  CASH: 'bg-warning-tint text-warning',
  E_WALLET: 'bg-success-tint text-success',
  BANK: 'bg-edit-tint text-edit',
};

const labels = {
  CASH: 'Cash',
  E_WALLET: 'E-wallet',
  BANK: 'Bank',
};

const AccountTypeChip = ({ type }) => (
  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tones[type] || ''}`}>
    {labels[type] || type}
  </span>
);

export const accountTypeOptions = [
  { value: 'CASH', label: <AccountTypeChip type="CASH" /> },
  { value: 'E_WALLET', label: <AccountTypeChip type="E_WALLET" /> },
  { value: 'BANK', label: <AccountTypeChip type="BANK" /> },
];

export default AccountTypeChip;
