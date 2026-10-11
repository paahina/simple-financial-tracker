const { Types } = require('mongoose');
const Transaction = require('../models/transactionModel');
const Account = require('../models/accountModel');
const DebtPayment = require('../models/debtPaymentModel');
const { HttpStatus } = require('../config/constants');
const { requireCategory } = require('./categoryController');
const {
  FinanceError,
  applySubBalanceDelta,
  pocketDeltaForType,
  requireOwnedAccount,
  resolvePocketId,
  sendFinanceError,
} = require('../utils/finance');
const { parsePagination, paginatedResponse } = require('../utils/pagination');
const { listActivityDays } = require('../utils/dayGroups');

const requireTransaction = async (userId, transactionId) => {
  const transaction = await Transaction.findOne({ _id: transactionId, userId });
  if (!transaction) {
    const error = new Error('Transaction not found');
    error.statusCode = HttpStatus.NOT_FOUND;
    throw error;
  }
  return transaction;
};

const getTransactionDays = async (req, res) => {
  try {
    const body = await listActivityDays(
      Transaction,
      { userId: new Types.ObjectId(req.user.id) },
      req.query,
      { kind: 'transaction' },
    );
    res.status(HttpStatus.OK).json(body);
  } catch (error) {
    sendFinanceError(res, error);
  }
};

const getAllTransactions = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = { userId: req.user.id };
    if (req.query.type) filter.type = req.query.type;
    if (req.query.accountId) filter.accountId = req.query.accountId;
    if (req.query.categoryId) filter.categoryId = req.query.categoryId;
    if (req.query.startDate || req.query.endDate) {
      filter.transactionDate = {};
      if (req.query.startDate) filter.transactionDate.$gte = new Date(req.query.startDate);
      if (req.query.endDate) filter.transactionDate.$lte = new Date(req.query.endDate);
    }
    if (req.query.search) {
      filter.label = { $regex: req.query.search, $options: 'i' };
    }
    const [total, transactions] = await Promise.all([
      Transaction.countDocuments(filter),
      Transaction.find(filter).sort({ transactionDate: -1, createdAt: -1 }).skip(skip).limit(limit),
    ]);
    res.status(HttpStatus.OK).json(paginatedResponse({ data: transactions, total, page, limit }));
  } catch (error) {
    sendFinanceError(res, error);
  }
};

const getTransactionById = async (req, res) => {
  try {
    const transaction = await requireTransaction(req.user.id, req.params.id);
    res.status(HttpStatus.OK).json(transaction);
  } catch (error) {
    sendFinanceError(res, error);
  }
};

const linkedPaymentMessage = 'Edit or delete this income from the debt payment';

const assertNotLinkedPayment = async (userId, transactionId) => {
  const linked = await DebtPayment.findOne({ userId, transactionId });
  if (linked) {
    throw new FinanceError(linkedPaymentMessage);
  }
};

const pocketIdFor = (account, requestedId) => resolvePocketId(account, requestedId || null);

const createTransaction = async (req, res) => {
  try {
    const account = await requireOwnedAccount(Account, req.user.id, req.body.accountId, { active: true });
    await requireCategory(req.user.id, req.body.categoryId, req.body.type);
    const amount = Number(req.body.amount);
    const subBalanceId = pocketIdFor(account, req.body.subBalanceId || null);
    applySubBalanceDelta(account, subBalanceId, pocketDeltaForType(req.body.type, amount));
    await account.save();
    const transaction = await Transaction.create({
      userId: req.user.id,
      accountId: req.body.accountId,
      subBalanceId,
      type: req.body.type,
      amount,
      label: req.body.label,
      categoryId: req.body.categoryId,
      description: req.body.description || '',
      transactionDate: new Date(req.body.transactionDate),
    });
    res.status(HttpStatus.CREATED).json({ message: 'Transaction created', transaction });
  } catch (error) {
    sendFinanceError(res, error);
  }
};

const updateTransaction = async (req, res) => {
  try {
    const transaction = await requireTransaction(req.user.id, req.params.id);
    await assertNotLinkedPayment(req.user.id, transaction._id);
    const nextType = req.body.type || transaction.type;
    const nextAccountId = req.body.accountId || transaction.accountId;
    const nextCategoryId = req.body.categoryId || transaction.categoryId;
    const nextAmount = req.body.amount !== undefined ? Number(req.body.amount) : transaction.amount;
    const oldAccount = await requireOwnedAccount(Account, req.user.id, transaction.accountId);
    const nextAccount = await requireOwnedAccount(Account, req.user.id, nextAccountId, {
      active: String(nextAccountId) !== String(transaction.accountId),
    });
    await requireCategory(req.user.id, nextCategoryId, nextType);
    const requestedSub =
      req.body.subBalanceId !== undefined ? req.body.subBalanceId || null : transaction.subBalanceId;
    const nextSubBalanceId = pocketIdFor(nextAccount, requestedSub);
    applySubBalanceDelta(
      oldAccount,
      transaction.subBalanceId,
      -pocketDeltaForType(transaction.type, transaction.amount),
    );
    if (String(oldAccount._id) === String(nextAccount._id)) {
      applySubBalanceDelta(oldAccount, nextSubBalanceId, pocketDeltaForType(nextType, nextAmount));
      await oldAccount.save();
    } else {
      await oldAccount.save();
      applySubBalanceDelta(nextAccount, nextSubBalanceId, pocketDeltaForType(nextType, nextAmount));
      await nextAccount.save();
    }
    if (req.body.accountId !== undefined) transaction.accountId = req.body.accountId;
    if (req.body.type !== undefined) transaction.type = req.body.type;
    if (req.body.amount !== undefined) transaction.amount = nextAmount;
    if (req.body.label !== undefined) transaction.label = req.body.label;
    if (req.body.categoryId !== undefined) transaction.categoryId = req.body.categoryId;
    if (req.body.description !== undefined) transaction.description = req.body.description;
    if (req.body.transactionDate !== undefined) {
      transaction.transactionDate = new Date(req.body.transactionDate);
    }
    transaction.subBalanceId = nextSubBalanceId;
    await transaction.save();
    res.status(HttpStatus.OK).json(transaction);
  } catch (error) {
    sendFinanceError(res, error);
  }
};

const deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findOne({ _id: req.params.id, userId: req.user.id });
    if (!transaction) {
      return res.status(HttpStatus.NOT_FOUND).json({ message: 'Transaction not found' });
    }
    await assertNotLinkedPayment(req.user.id, transaction._id);
    const account = await requireOwnedAccount(Account, req.user.id, transaction.accountId);
    applySubBalanceDelta(
      account,
      transaction.subBalanceId,
      -pocketDeltaForType(transaction.type, transaction.amount),
    );
    await account.save();
    await transaction.deleteOne();
    res.status(HttpStatus.OK).json({ message: 'Transaction deleted' });
  } catch (error) {
    sendFinanceError(res, error);
  }
};

module.exports = {
  getAllTransactions,
  getTransactionDays,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
};
