import { fromCentavos, toCentavos } from './format';

export const debtKindOptions = [
  { value: 'INDIVIDUAL', label: 'Individual' },
  { value: 'CONTRIBUTION', label: 'Contribution' },
];

const rowKey = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;

export const emptyPayer = (seed = {}) => ({
  key: seed.key || rowKey(),
  _id: seed._id,
  name: seed.name || '',
  amount: seed.amount ?? '',
  touched: Boolean(seed.touched),
});

export const splitShares = (total, count) => {
  const n = Number(count);
  const amount = Number(total);
  if (!Number.isInteger(n) || n < 1 || !Number.isInteger(amount) || amount < 0) return [];
  const base = Math.floor(amount / n);
  const remainder = amount - base * n;
  return Array.from({ length: n }, (_, index) => base + (index === 0 ? remainder : 0));
};

export const applySplit = (totalCentavos, payers) => {
  const untouched = payers.filter((row) => !row.touched);
  if (!untouched.length) return payers;
  const touchedSum = payers
    .filter((row) => row.touched)
    .reduce((sum, row) => {
      const amount = toCentavos(row.amount);
      return Number.isInteger(amount) ? sum + amount : sum;
    }, 0);
  const remaining = Math.max(0, Number(totalCentavos || 0) - touchedSum);
  const shares = splitShares(remaining, untouched.length);
  let index = 0;
  return payers.map((row) =>
    row.touched ? row : { ...row, amount: remaining > 0 ? fromCentavos(shares[index++]) : '' },
  );
};

export const payerShareSum = (payers) =>
  payers.reduce((sum, row) => {
    const amount = toCentavos(row.amount);
    return Number.isInteger(amount) && amount > 0 ? sum + amount : sum;
  }, 0);

export const ORIGINAL_CATEGORY_VALUE = 'original';

export const categoryOptionValue = (id) => (id == null ? ORIGINAL_CATEGORY_VALUE : String(id));

export const categoryOptions = (categories = []) =>
  categories.map((line) => ({
    value: categoryOptionValue(line.id),
    label: line.label,
  }));

export const categoryIdForDebt = (categories = [], currentId = '') => {
  const options = categoryOptions(categories);
  if (!options.length) return '';
  if (currentId && options.some((item) => item.value === String(currentId))) return currentId;
  if (options.length === 1) return options[0].value;
  return '';
};

export const payloadCategoryId = (value) => {
  if (!value || value === ORIGINAL_CATEGORY_VALUE) return null;
  return value;
};
