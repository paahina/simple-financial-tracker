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

export const formatDateTime = (value) => {
  if (!value) return '';
  return new Date(value).toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const pad = (value) => String(value).padStart(2, '0');

export const nowDatetimeLocal = () => {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
};

export const datetimeLocalInput = (value) => {
  if (!value) return nowDatetimeLocal();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return nowDatetimeLocal();
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const datetimeLocalToIso = (value) => new Date(value).toISOString();

export const todayInput = () => {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

export const dateInput = (value) => {
  if (!value) return todayInput();
  return new Date(value).toISOString().slice(0, 10);
};

export const toIsoDate = (value) => `${value}T00:00:00.000Z`;
