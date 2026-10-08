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

const balanceForAccount = async (account, models) => {
  const accountId = account._id;
  const userId = account.userId;
  const [income, expenses, transfersIn, transfersOut, debtPayments] =
    await Promise.all([
      sumAmount(models.Transaction, { userId, accountId, type: 'INCOME' }),
      sumAmount(models.Transaction, { userId, accountId, type: 'EXPENSE' }),
      sumAmount(models.Transfer, { userId, toAccountId: accountId }),
      sumAmount(models.Transfer, { userId, fromAccountId: accountId }),
      sumAmount(models.DebtPayment, { userId, accountId }),
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
  balanceForAccount,
  debtTotals,
  debtState,
  owedAmount,
  categoryTotals,
  sendFinanceError,
};
