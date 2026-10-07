export const toCentavos = (pesos) => Math.round(Number(pesos) * 100);

export const fromCentavos = (centavos) => ((Number(centavos) || 0) / 100).toFixed(2);

export const formatPeso = (centavos) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format((Number(centavos) || 0) / 100);

export const formatDate = (value) => {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const todayInput = () => new Date().toISOString().slice(0, 10);

export const dateInput = (value) => {
  if (!value) return todayInput();
  return new Date(value).toISOString().slice(0, 10);
};

export const toIsoDate = (value) => `${value}T00:00:00.000Z`;
