export const requiredText = (value, label, min = 1) => {
  const text = String(value ?? '').trim();
  if (!text) return `${label} is required`;
  if (text.length < min) return `${label} must be at least ${min} characters`;
  return '';
};

export const requiredChoice = (value, label) => (value ? '' : `${label} is required`);

export const requiredAmount = (value, label = 'Amount') => {
  if (value === '' || value == null) return `${label} is required`;
  if (Number(value) <= 0) return `${label} must be greater than 0`;
  return '';
};

export const optionalAmount = (value, label = 'Amount') => {
  if (value === '' || value == null) return '';
  if (Number(value) < 0) return `${label} cannot be negative`;
  return '';
};

export const hasErrors = (errors) => Object.values(errors).some(Boolean);
