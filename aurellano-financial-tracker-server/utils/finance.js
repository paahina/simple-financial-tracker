const mongoose = require('mongoose');
const { HttpStatus } = require('../config/constants');

class FinanceError extends Error {
  constructor(message, statusCode = HttpStatus.BAD_REQUEST) {
    super(message);
    this.name = 'FinanceError';
    this.statusCode = statusCode;
  }
}

const toId = (value) => new mongoose.Types.ObjectId(String(value));

const startOfMonth = (year, month) => new Date(Date.UTC(year, month - 1, 1));

const monthRange = (year, month) => ({
  start: startOfMonth(year, month),
  end: startOfMonth(month === 12 ? year + 1 : year, month === 12 ? 1 : month + 1),
});

const idFields = [
  'userId',
  'accountId',
  'categoryId',
  'debtId',
  'fromAccountId',
  'toAccountId',
  'transactionId',
  'subBalanceId',
  'fromSubBalanceId',
  'toSubBalanceId',
];

const normalizeMatch = (match) => {
  const next = { ...match };
  for (const field of idFields) {
    if (typeof next[field] === 'string' && mongoose.isValidObjectId(next[field])) {
      next[field] = toId(next[field]);
    }
  }
  return next;
};

const sumAmount = async (Model, match) => {
  const [row] = await Model.aggregate([
    { $match: normalizeMatch(match) },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  return row?.total || 0;
};

const requireOwnedAccount = async (Account, userId, accountId, options = {}) => {
  if (!mongoose.isValidObjectId(accountId)) {
    throw new FinanceError('Invalid account id');
  }
  const account = await Account.findOne({ _id: accountId, userId });
  if (!account) {
    throw new FinanceError('Account not found', HttpStatus.NOT_FOUND);
  }
  if (options.active && !account.isActive) {
    throw new FinanceError('Account is inactive');
  }
  return account;
};

const DEFAULT_CURRENT_LABEL = 'Current';

const hasSubBalances = (account) => Boolean(account?.subBalances?.length);

const subBalanceSum = (account) =>
  (account?.subBalances || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);

const findSubBalance = (account, subBalanceId) => {
  if (!account || !subBalanceId) return null;
  return account.subBalances.id(subBalanceId);
};

const requireSubBalance = (account, subBalanceId) => {
  if (!hasSubBalances(account)) {
    if (subBalanceId) {
      throw new FinanceError('This account has no sub-balances');
    }
    return null;
  }
  if (!subBalanceId) {
    throw new FinanceError('Sub-balance is required');
  }
  const slice = findSubBalance(account, subBalanceId);
  if (!slice) {
    throw new FinanceError('Sub-balance not found');
  }
  return slice;
};

const applySubBalanceDelta = (account, subBalanceId, delta) => {
  if (!delta || !subBalanceId) return;
  const slice = requireSubBalance(account, subBalanceId);
  if (!slice) return;
  const next = Number(slice.amount) + Number(delta);
  if (next < 0) {
    throw new FinanceError('Sub-balance cannot go below zero');
  }
  slice.amount = next;
};

const normalizeSubBalances = (items) => {
  if (items == null) return null;
  if (!Array.isArray(items)) {
    throw new FinanceError('Sub-balances must be a list');
  }
  return items.map((item) => {
    const label = String(item.label || '').trim();
    const amount = Number(item.amount || 0);
    if (!label) {
      throw new FinanceError('Sub-balance label is required');
    }
    if (label.length > 100) {
      throw new FinanceError('Sub-balance label is too long');
    }
    if (!Number.isInteger(amount) || amount < 0) {
      throw new FinanceError('Sub-balance amount cannot be negative');
    }
    const next = { label, amount };
    if (item._id && mongoose.isValidObjectId(item._id)) next._id = item._id;
    return next;
  });
};

const requireAtLeastOneSubBalance = (items) => {
  const next = normalizeSubBalances(items) || [];
  if (!next.length) {
    throw new FinanceError('An account must have at least one sub-balance');
  }
  return next;
};

const findCurrentPocket = (account) =>
  (account.subBalances || []).find(
    (item) => String(item.label || '').trim().toLowerCase() === DEFAULT_CURRENT_LABEL.toLowerCase(),
  ) || account.subBalances?.[0];

const ensureAccountPockets = (account, balance) => {
  const target = Math.max(0, Number(balance) || 0);
  if (!account.subBalances) account.subBalances = [];
  if (!account.subBalances.length) {
    account.subBalances.push({ label: DEFAULT_CURRENT_LABEL, amount: target });
    return true;
  }
  const sum = subBalanceSum(account);
  if (sum >= target) return false;
  const remainder = target - sum;
  const current = findCurrentPocket(account);
  if (current) {
    current.amount = Number(current.amount) + remainder;
  } else {
    account.subBalances.unshift({ label: DEFAULT_CURRENT_LABEL, amount: remainder });
  }
  return true;
};

const syncPocketsToBalance = (account, desired) => {
  const target = Number(desired);
  ensureAccountPockets(account, target);
  const delta = target - subBalanceSum(account);
  if (!delta) return;
  const current = findCurrentPocket(account);
  applySubBalanceDelta(account, current._id, delta);
};

const resolvePocketId = (account, requestedId) => {
  if (!account) return null;
  if (requestedId) {
    requireSubBalance(account, requestedId);
    return requestedId;
  }
  if (account.subBalances?.length === 1) {
    return account.subBalances[0]._id;
  }
  if (hasSubBalances(account)) {
    throw new FinanceError('Sub-balance is required');
  }
  return null;
};

const assertSubBalancesMatch = (account, balance) => {
  if (subBalanceSum(account) !== Number(balance)) {
    throw new FinanceError('Sub-balances must add up to the account total');
  }
};

const pocketDeltaForType = (type, amount) => (type === 'EXPENSE' ? -Number(amount) : Number(amount));

const applyTransferPockets = async (fromAccount, fromSubId, toAccount, toSubId, amount, direction = 1) => {
  const delta = Number(amount) * direction;
  const same =
    fromAccount && toAccount && String(fromAccount._id) === String(toAccount._id);
  if (same) {
    applySubBalanceDelta(fromAccount, fromSubId, -delta);
    applySubBalanceDelta(fromAccount, toSubId, delta);
    await fromAccount.save();
    return;
  }
  if (fromAccount) {
    applySubBalanceDelta(fromAccount, fromSubId, -delta);
    await fromAccount.save();
  }
  if (toAccount) {
    applySubBalanceDelta(toAccount, toSubId, delta);
    await toAccount.save();
  }
};

const assertTransferTargets = (fromAccount, fromSubId, toAccount, toSubId) => {
  if (fromAccount && toAccount && String(fromAccount._id) === String(toAccount._id)) {
    if (!hasSubBalances(fromAccount)) {
      throw new FinanceError('Source and destination accounts must be different');
    }
    if (!fromSubId || !toSubId || String(fromSubId) === String(toSubId)) {
      throw new FinanceError('Choose two different sub-balances');
    }
  }
};

const balanceForAccount = async (account, models) => {
  const accountId = account._id;
  const userId = account.userId;
  const [income, expenses, transfersIn, transfersOut, debtPayments] =
    await Promise.all([
      sumAmount(models.Transaction, { userId, accountId, type: 'INCOME' }),
      sumAmount(models.Transaction, { userId, accountId, type: 'EXPENSE' }),
      sumAmount(models.Transfer, { userId, toAccountId: accountId }),
      sumAmount(models.Transfer, { userId, fromAccountId: accountId }),
      sumAmount(models.DebtPayment, {
        userId,
        accountId,
        $or: [{ transactionId: { $exists: false } }, { transactionId: null }],
      }),
    ]);

  return (
    account.initialBalance +
    income -
    expenses +
    transfersIn -
    transfersOut +
    debtPayments
  );
};

const debtTotals = async (DebtPayment, debtId) =>
  sumAmount(DebtPayment, { debtId });

const owedAmount = (debt) =>
  Number(debt.originalAmount) +
  (debt.additions || []).reduce((sum, line) => sum + Number(line.amount), 0);

const debtState = (originalAmount, paidAmount, dueDate, now = new Date()) => {
  const remaining = Math.max(originalAmount - paidAmount, 0);
  let status = 'PENDING';
  if (remaining === 0) {
    status = 'PAID';
  } else if (dueDate && dueDate < now) {
    status = 'OVERDUE';
  } else if (paidAmount > 0) {
    status = 'PARTIALLY_PAID';
  }
  return { remaining, status };
};

const categoryTotals = async (Transaction, Category, match) => {
  const rows = await Transaction.aggregate([
    { $match: normalizeMatch(match) },
    { $group: { _id: '$categoryId', total: { $sum: '$amount' } } },
  ]);
  const categories = await Category.find({
    _id: { $in: rows.map((row) => row._id) },
  }).select('name type');
  const names = new Map(categories.map((category) => [String(category._id), category.name]));
  return rows.map((row) => ({
    categoryId: row._id,
    categoryName: names.get(String(row._id)) || 'Unknown',
    total: row.total,
  }));
};

const sendFinanceError = (res, error) => {
  const status = error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
  res.status(status).json({ message: error.message });
};

module.exports = {
  FinanceError,
  toId,
  monthRange,
  sumAmount,
  requireOwnedAccount,
  hasSubBalances,
  subBalanceSum,
  requireSubBalance,
  applySubBalanceDelta,
  normalizeSubBalances,
  requireAtLeastOneSubBalance,
  DEFAULT_CURRENT_LABEL,
  ensureAccountPockets,
  syncPocketsToBalance,
  resolvePocketId,
  assertSubBalancesMatch,
  pocketDeltaForType,
  applyTransferPockets,
  assertTransferTargets,
  balanceForAccount,
  debtTotals,
  debtState,
  owedAmount,
  categoryTotals,
  sendFinanceError,
};
