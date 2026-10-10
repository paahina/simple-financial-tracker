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
