const Account = require('../models/accountModel');
const Transaction = require('../models/transactionModel');
const Transfer = require('../models/transferModel');
const DebtPayment = require('../models/debtPaymentModel');
const { HttpStatus } = require('../config/constants');
const { isPaged, parsePagination, paginatedResponse } = require('../utils/pagination');
const {
  FinanceError,
  balanceForAccount,
  requireOwnedAccount,
  sendFinanceError,
} = require('../utils/finance');

const models = { Transaction, Transfer, DebtPayment };

const withBalance = async (account) => {
  const plain = account.toObject();
  plain.balance = await balanceForAccount(account, models);
  return plain;
};

const getAllAccounts = async (req, res) => {
  try {
    const base = { userId: req.user.id };
    if (!isPaged(req.query)) {
      const filter = { ...base };
      if (req.query.activeOnly === 'true') filter.isActive = true;
      const accounts = await Account.find(filter).sort({ name: 1 });
      const withBalances = await Promise.all(accounts.map(withBalance));
      res.status(HttpStatus.OK).json(withBalances);
      return;
    }
    const isActive = req.query.isActive !== 'false';
    const filter = { ...base, isActive };
    const { page, limit, skip } = parsePagination(req.query);
    const [total, accounts, active, deactivated] = await Promise.all([
      Account.countDocuments(filter),
      Account.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
      Account.countDocuments({ ...base, isActive: true }),
      Account.countDocuments({ ...base, isActive: false }),
    ]);
    const data = await Promise.all(accounts.map(withBalance));
    res.status(HttpStatus.OK).json({
      ...paginatedResponse({ data, total, page, limit }),
      counts: { active, deactivated },
    });
  } catch (error) {
    sendFinanceError(res, error);
  }
};

const getAccountById = async (req, res) => {
  try {
    const account = await requireOwnedAccount(Account, req.user.id, req.params.id);
    res.status(HttpStatus.OK).json(await withBalance(account));
  } catch (error) {
    sendFinanceError(res, error);
  }
};

const createAccount = async (req, res) => {
  try {
    const account = await Account.create({
      userId: req.user.id,
      name: req.body.name,
      type: req.body.type,
      initialBalance: Number(req.body.initialBalance || 0),
      currency: req.body.currency || 'PHP',
      description: req.body.description || '',
      remainingBalance: req.body.remainingBalance == null ? null : Number(req.body.remainingBalance),
      isActive: true,
    });
    res.status(HttpStatus.CREATED).json({
      message: 'Account created',
      account: await withBalance(account),
    });
  } catch (error) {
    sendFinanceError(res, error);
  }
};

const updateAccount = async (req, res) => {
  try {
    const account = await requireOwnedAccount(Account, req.user.id, req.params.id);
    const { name, type, currency, description, currentBalance, remainingBalance } = req.body;
    if (name !== undefined) account.name = name;
    if (type !== undefined) account.type = type;
    if (currency !== undefined) account.currency = currency;
    if (description !== undefined) account.description = description;
    if (remainingBalance !== undefined) {
      account.remainingBalance = remainingBalance == null ? null : Number(remainingBalance);
    }
    if (currentBalance !== undefined) {
      const desired = Number(currentBalance);
      const current = await balanceForAccount(account, models);
      account.initialBalance = account.initialBalance + (desired - current);
    }
    await account.save();
    res.status(HttpStatus.OK).json(await withBalance(account));
  } catch (error) {
    sendFinanceError(res, error);
  }
};

const deleteAccount = async (req, res) => {
  try {
    const account = await requireOwnedAccount(Account, req.user.id, req.params.id);
    const accountId = account._id;
    const userId = req.user.id;
    const [transactions, transfersOut, transfersIn, debtPayments] = await Promise.all([
      Transaction.countDocuments({ userId, accountId }),
      Transfer.countDocuments({ userId, fromAccountId: accountId }),
      Transfer.countDocuments({ userId, toAccountId: accountId }),
      DebtPayment.countDocuments({ userId, accountId }),
    ]);
    if (transactions || transfersOut || transfersIn || debtPayments) {
      throw new FinanceError('This account has activity. Deactivate it instead of deleting it.');
    }
    await account.deleteOne();
    res.status(HttpStatus.OK).json({ message: 'Account deleted' });
  } catch (error) {
    sendFinanceError(res, error);
  }
};

const deactivateAccount = async (req, res) => {
  try {
    const account = await requireOwnedAccount(Account, req.user.id, req.params.id);
    account.isActive = false;
    await account.save();
    res.status(HttpStatus.OK).json({
      message: 'Account deactivated',
      account: await withBalance(account),
    });
  } catch (error) {
    sendFinanceError(res, error);
  }
};

const reactivateAccount = async (req, res) => {
  try {
    const account = await requireOwnedAccount(Account, req.user.id, req.params.id);
    if (!account.isActive) {
      account.isActive = true;
      await account.save();
    }
    res.status(HttpStatus.OK).json({
      message: 'Account reactivated',
      account: await withBalance(account),
    });
  } catch (error) {
    sendFinanceError(res, error);
  }
};

const getAccountActivity = async (req, res) => {
  try {
    const account = await requireOwnedAccount(Account, req.user.id, req.params.id);
    const accountId = account._id;
    const userId = req.user.id;
    const [transactions, transfersOut, transfersIn, debtPayments] = await Promise.all([
      Transaction.find({ userId, accountId }).sort({ transactionDate: -1 }),
      Transfer.find({ userId, fromAccountId: accountId }).sort({ transactionDate: -1 }),
      Transfer.find({ userId, toAccountId: accountId }).sort({ transactionDate: -1 }),
      DebtPayment.find({ userId, accountId }).sort({ paymentDate: -1 }),
    ]);
    res.status(HttpStatus.OK).json({
      account: await withBalance(account),
      transactions,
      transfersOut,
      transfersIn,
      debtPayments,
    });
  } catch (error) {
    sendFinanceError(res, error);
  }
};

module.exports = {
  getAllAccounts,
  getAccountById,
  createAccount,
  updateAccount,
  deactivateAccount,
  reactivateAccount,
  deleteAccount,
  getAccountActivity,
};
