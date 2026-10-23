import { browserTimeZone } from '../utils/format';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';

const toQuery = (params) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : '';
};

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const parseResponse = async (response) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(data.message || 'Request failed', response.status);
  }
  return data;
};

const busyListeners = new Set();

export const subscribeBusy = (listener) => {
  busyListeners.add(listener);
  return () => busyListeners.delete(listener);
};

const notifyBusy = (delta) => {
  busyListeners.forEach((listener) => listener(delta));
};

export const beginBusy = () => notifyBusy(1);

export const endBusy = () => notifyBusy(-1);

const tracksBusy = (path, method) =>
  method !== 'GET' &&
  method !== 'HEAD' &&
  path !== '/api/users/login' &&
  path !== '/api/users/register';

export const apiRequest = async (path, { method = 'GET', body, token, signal } = {}) => {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const track = tracksBusy(path, method);
  if (track) notifyBusy(1);

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      signal,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return await parseResponse(response);
  } finally {
    if (track) notifyBusy(-1);
  }
};

export const loginRequest = (credentials) =>
  apiRequest('/api/users/login', { method: 'POST', body: credentials });

export const signupRequest = (payload) =>
  apiRequest('/api/users/register', { method: 'POST', body: payload });

export const logoutRequest = (token) =>
  apiRequest('/api/users/logout', { method: 'POST', token });

export const sessionRequest = (token, { signal } = {}) =>
  apiRequest('/api/users/session', { token, signal });

export const getDashboardRequest = (token, accountPage = 1, accountLimit = 10) =>
  apiRequest(`/api/dashboard/get${toQuery({ accountPage, accountLimit })}`, { token });

export const getAccountsRequest = (token, { page, limit, activeOnly, isActive } = {}) =>
  apiRequest(
    `/api/accounts/getAllAccounts${toQuery({
      page,
      limit,
      activeOnly: activeOnly ? 'true' : undefined,
      isActive: isActive === undefined ? undefined : String(isActive),
    })}`,
    { token },
  );

export const getAccountRequest = (id, token) => apiRequest(`/api/accounts/get/${id}`, { token });

export const createAccountRequest = (payload, token) =>
  apiRequest('/api/accounts/create', { method: 'POST', body: payload, token });

export const updateAccountRequest = (id, payload, token) =>
  apiRequest(`/api/accounts/update/${id}`, { method: 'PUT', body: payload, token });

export const deactivateAccountRequest = (id, token) =>
  apiRequest(`/api/accounts/delete/${id}`, { method: 'DELETE', token });

export const reactivateAccountRequest = (id, token) =>
  apiRequest(`/api/accounts/reactivate/${id}`, { method: 'PUT', token });

export const deleteAccountRequest = (id, token) =>
  apiRequest(`/api/accounts/remove/${id}`, { method: 'DELETE', token });

export const getCategoriesRequest = (token, { type, includeInactive, page, limit } = {}) =>
  apiRequest(
    `/api/categories/getAllCategories${toQuery({
      type,
      includeInactive: includeInactive ? 'true' : undefined,
      page,
      limit,
    })}`,
    { token },
  );

export const getCategoryRequest = (id, token) => apiRequest(`/api/categories/get/${id}`, { token });

export const createCategoryRequest = (payload, token) =>
  apiRequest('/api/categories/create', { method: 'POST', body: payload, token });

export const updateCategoryRequest = (id, payload, token) =>
  apiRequest(`/api/categories/update/${id}`, { method: 'PUT', body: payload, token });

export const deactivateCategoryRequest = (id, token) =>
  apiRequest(`/api/categories/delete/${id}`, { method: 'DELETE', token });

export const getTransactionDaysRequest = (token, page = 1, limit = 10) =>
  apiRequest(
    `/api/transactions/days${toQuery({ page, limit, timezone: browserTimeZone() })}`,
    { token },
  );

export const getTransactionsRequest = (token, page = 1, limit = 50, range = {}) =>
  apiRequest(`/api/transactions/getAllTransactions${toQuery({ page, limit, ...range })}`, { token });

export const getTransactionRequest = (id, token) =>
  apiRequest(`/api/transactions/get/${id}`, { token });

export const createTransactionRequest = (payload, token) =>
  apiRequest('/api/transactions/create', { method: 'POST', body: payload, token });

export const updateTransactionRequest = (id, payload, token) =>
  apiRequest(`/api/transactions/update/${id}`, { method: 'PUT', body: payload, token });

export const deleteTransactionRequest = (id, token) =>
  apiRequest(`/api/transactions/delete/${id}`, { method: 'DELETE', token });

export const getTransferDaysRequest = (token, page = 1, limit = 10) =>
  apiRequest(`/api/transfers/days${toQuery({ page, limit, timezone: browserTimeZone() })}`, { token });

export const getTransfersRequest = (token, page = 1, limit = 50, range = {}) =>
  apiRequest(`/api/transfers/getAllTransfers${toQuery({ page, limit, ...range })}`, { token });

export const getTransferRequest = (id, token) => apiRequest(`/api/transfers/get/${id}`, { token });

export const createTransferRequest = (payload, token) =>
  apiRequest('/api/transfers/create', { method: 'POST', body: payload, token });

export const updateTransferRequest = (id, payload, token) =>
  apiRequest(`/api/transfers/update/${id}`, { method: 'PUT', body: payload, token });

export const deleteTransferRequest = (id, token) =>
  apiRequest(`/api/transfers/delete/${id}`, { method: 'DELETE', token });

export const getDebtsRequest = (token, { page, limit, status } = {}) =>
  apiRequest(`/api/debts/getAllDebts${toQuery({ page, limit, status })}`, { token });

export const getDebtRequest = (id, token, paging = {}) =>
  apiRequest(`/api/debts/get/${id}${toQuery(paging)}`, { token });

export const createDebtRequest = (payload, token) =>
  apiRequest('/api/debts/create', { method: 'POST', body: payload, token });

export const updateDebtRequest = (id, payload, token) =>
  apiRequest(`/api/debts/update/${id}`, { method: 'PUT', body: payload, token });

export const deleteDebtRequest = (id, token) =>
  apiRequest(`/api/debts/delete/${id}`, { method: 'DELETE', token });

export const addToDebtBalanceRequest = (payload, token) =>
  apiRequest('/api/debts/addToBalance', { method: 'POST', body: payload, token });

export const createDebtAdditionRequest = (payload, token) =>
  apiRequest('/api/debts/createAddition', { method: 'POST', body: payload, token });

export const updateDebtAdditionRequest = (id, payload, token) =>
  apiRequest(`/api/debts/updateAddition/${id}`, { method: 'PUT', body: payload, token });

export const deleteDebtAdditionRequest = (id, token) =>
  apiRequest(`/api/debts/deleteAddition/${id}`, { method: 'DELETE', token });

export const createDebtPaymentRequest = (payload, token) =>
  apiRequest('/api/debts/createPayment', { method: 'POST', body: payload, token });

export const updateDebtPaymentRequest = (id, payload, token) =>
  apiRequest(`/api/debts/updatePayment/${id}`, { method: 'PUT', body: payload, token });

export const deleteDebtPaymentRequest = (id, token) =>
  apiRequest(`/api/debts/deletePayment/${id}`, { method: 'DELETE', token });

export const getToBuyRequest = (token, { page, limit } = {}) =>
  apiRequest(`/api/to-buy/getAll${toQuery({ page, limit })}`, { token });

export const getToBuyItemRequest = (id, token) => apiRequest(`/api/to-buy/get/${id}`, { token });

export const createToBuyRequest = (payload, token) =>
  apiRequest('/api/to-buy/create', { method: 'POST', body: payload, token });

export const updateToBuyRequest = (id, payload, token) =>
  apiRequest(`/api/to-buy/update/${id}`, { method: 'PUT', body: payload, token });

export const deleteToBuyRequest = (id, token) =>
  apiRequest(`/api/to-buy/delete/${id}`, { method: 'DELETE', token });

export const completeToBuyRequest = (id, payload, token) =>
  apiRequest(`/api/to-buy/complete/${id}`, { method: 'POST', body: payload, token });

export const getMonthlyReportRequest = (token, year, month, page = 1, limit = 10, categories = {}) =>
  apiRequest(
    `/api/reports/monthly${toQuery({
      year,
      month,
      page,
      limit,
      incomePage: categories.incomePage,
      incomeLimit: categories.incomeLimit,
      expenseCategoryPage: categories.expenseCategoryPage,
      expenseCategoryLimit: categories.expenseCategoryLimit,
    })}`,
    { token },
  );

export const getYearlyReportRequest = (token, year) =>
  apiRequest(`/api/reports/yearly?year=${year}`, { token });
