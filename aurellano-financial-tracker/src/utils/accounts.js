import { formatPeso } from './format';

export const selectableAccounts = (accounts, selectedIds = []) => {
  const selected = new Set(selectedIds.filter((id) => id && id !== 'other').map(String));
  return accounts.filter((account) => account.isActive || selected.has(String(account._id)));
};

export const belowRemainingBalance = (currentCentavos, remainingCentavos) =>
  remainingCentavos != null && Number(currentCentavos) < Number(remainingCentavos);

export const accountOption = (account) => ({
  value: account._id,
  label: account.isActive ? account.name : `${account.name} (deactivated)`,
});

export const accountById = (accounts, id) =>
  (accounts || []).find((account) => String(account._id) === String(id));

export const pocketOptions = (account) =>
  (account?.subBalances || []).map((item) => ({
    value: item._id,
    label: item.label,
  }));

export const accountAmount = (account) => {
  if (!account) return null;
  if (account.balance != null && account.balance !== '') return Number(account.balance);
  return (account.subBalances || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);
};

export const pocketAmount = (account, pocketId) => {
  const pocket = (account?.subBalances || []).find((item) => String(item._id) === String(pocketId || ''));
  return pocket ? Number(pocket.amount || 0) : null;
};

export const labelWithBalance = (label, centavos) => {
  if (centavos == null || Number.isNaN(Number(centavos))) return label;
  return `${label} · ${formatPeso(centavos)}`;
};

export const accountLabelWithBalance = (label, account) =>
  account ? labelWithBalance(label, accountAmount(account)) : label;

export const pocketIdForAccount = (accounts, accountId, currentId = '') => {
  const options = pocketOptions(accountById(accounts, accountId));
  if (!options.length) return '';
  if (currentId && options.some((item) => String(item.value) === String(currentId))) return currentId;
  if (options.length === 1) return options[0].value;
  return '';
};
