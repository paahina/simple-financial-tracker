const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';

const parseResponse = async (response) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }
  return data;
};

export const apiRequest = async (path, { method = 'GET', body, token } = {}) => {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  return parseResponse(response);
};

export const loginRequest = (credentials) =>
  apiRequest('/api/users/login', { method: 'POST', body: credentials });

export const signupRequest = (payload) =>
  apiRequest('/api/users/register', { method: 'POST', body: payload });

export const logoutRequest = (token) =>
  apiRequest('/api/users/logout', { method: 'POST', token });

export const sessionRequest = (token) => apiRequest('/api/users/session', { token });

export const getDashboardRequest = (token) => apiRequest('/api/dashboard/get', { token });

export const getAccountsRequest = (token) => apiRequest('/api/accounts/getAllAccounts', { token });

export const getAccountRequest = (id, token) => apiRequest(`/api/accounts/get/${id}`, { token });

export const createAccountRequest = (payload, token) =>
  apiRequest('/api/accounts/create', { method: 'POST', body: payload, token });

export const updateAccountRequest = (id, payload, token) =>
  apiRequest(`/api/accounts/update/${id}`, { method: 'PUT', body: payload, token });

export const deactivateAccountRequest = (id, token) =>
  apiRequest(`/api/accounts/delete/${id}`, { method: 'DELETE', token });

export const getCategoriesRequest = (token, { type, includeInactive } = {}) => {
  const params = new URLSearchParams();
  if (type) params.set('type', type);
  if (includeInactive) params.set('includeInactive', 'true');
  const query = params.toString();
  return apiRequest(`/api/categories/getAllCategories${query ? `?${query}` : ''}`, { token });
};

export const getCategoryRequest = (id, token) => apiRequest(`/api/categories/get/${id}`, { token });

export const createCategoryRequest = (payload, token) =>
  apiRequest('/api/categories/create', { method: 'POST', body: payload, token });

export const updateCategoryRequest = (id, payload, token) =>
  apiRequest(`/api/categories/update/${id}`, { method: 'PUT', body: payload, token });

export const deactivateCategoryRequest = (id, token) =>
  apiRequest(`/api/categories/delete/${id}`, { method: 'DELETE', token });

export const getTransactionsRequest = (token, page = 1, limit = 50) =>
  apiRequest(`/api/transactions/getAllTransactions?page=${page}&limit=${limit}`, { token });

export const getTransactionRequest = (id, token) =>
  apiRequest(`/api/transactions/get/${id}`, { token });

export const createTransactionRequest = (payload, token) =>
  apiRequest('/api/transactions/create', { method: 'POST', body: payload, token });

export const updateTransactionRequest = (id, payload, token) =>
  apiRequest(`/api/transactions/update/${id}`, { method: 'PUT', body: payload, token });

export const deleteTransactionRequest = (id, token) =>
  apiRequest(`/api/transactions/delete/${id}`, { method: 'DELETE', token });

export const getTransfersRequest = (token, page = 1, limit = 50) =>
  apiRequest(`/api/transfers/getAllTransfers?page=${page}&limit=${limit}`, { token });

export const getTransferRequest = (id, token) => apiRequest(`/api/transfers/get/${id}`, { token });

export const createTransferRequest = (payload, token) =>
  apiRequest('/api/transfers/create', { method: 'POST', body: payload, token });

export const updateTransferRequest = (id, payload, token) =>
  apiRequest(`/api/transfers/update/${id}`, { method: 'PUT', body: payload, token });

export const deleteTransferRequest = (id, token) =>
  apiRequest(`/api/transfers/delete/${id}`, { method: 'DELETE', token });

export const getDebtsRequest = (token) => apiRequest('/api/debts/getAllDebts', { token });

export const getDebtRequest = (id, token) => apiRequest(`/api/debts/get/${id}`, { token });

export const createDebtRequest = (payload, token) =>
  apiRequest('/api/debts/create', { method: 'POST', body: payload, token });

export const updateDebtRequest = (id, payload, token) =>
  apiRequest(`/api/debts/update/${id}`, { method: 'PUT', body: payload, token });

export const deleteDebtRequest = (id, token) =>
  apiRequest(`/api/debts/delete/${id}`, { method: 'DELETE', token });

export const createDebtPaymentRequest = (payload, token) =>
  apiRequest('/api/debts/createPayment', { method: 'POST', body: payload, token });

export const updateDebtPaymentRequest = (id, payload, token) =>
  apiRequest(`/api/debts/updatePayment/${id}`, { method: 'PUT', body: payload, token });

export const deleteDebtPaymentRequest = (id, token) =>
  apiRequest(`/api/debts/deletePayment/${id}`, { method: 'DELETE', token });

export const getMonthlyReportRequest = (token, year, month, page = 1, limit = 10) =>
  apiRequest(`/api/reports/monthly?year=${year}&month=${month}&page=${page}&limit=${limit}`, { token });

export const getYearlyReportRequest = (token, year) =>
  apiRequest(`/api/reports/yearly?year=${year}`, { token });
