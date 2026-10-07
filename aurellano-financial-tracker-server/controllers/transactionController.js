const Transaction = require('../models/transactionModel');
const Account = require('../models/accountModel');
const { HttpStatus } = require('../config/constants');
const { requireCategory } = require('./categoryController');
const { requireOwnedAccount, sendFinanceError } = require('../utils/finance');
const { parsePagination, paginatedResponse } = require('../utils/pagination');

const requireTransaction = async (userId, transactionId) => {
  const transaction = await Transaction.findOne({ _id: transactionId, userId });
  if (!transaction) {
    const error = new Error('Transaction not found');
    error.statusCode = HttpStatus.NOT_FOUND;
    throw error;
  }
  return transaction;
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

const createTransaction = async (req, res) => {
  try {
    await requireOwnedAccount(Account, req.user.id, req.body.accountId, { active: true });
    await requireCategory(req.user.id, req.body.categoryId, req.body.type);
    const transaction = await Transaction.create({
      userId: req.user.id,
      accountId: req.body.accountId,
      type: req.body.type,
      amount: Number(req.body.amount),
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
    const nextType = req.body.type || transaction.type;
    const nextAccountId = req.body.accountId || transaction.accountId;
    const nextCategoryId = req.body.categoryId || transaction.categoryId;
    await requireOwnedAccount(Account, req.user.id, nextAccountId, { active: true });
    await requireCategory(req.user.id, nextCategoryId, nextType);
    if (req.body.accountId !== undefined) transaction.accountId = req.body.accountId;
    if (req.body.type !== undefined) transaction.type = req.body.type;
    if (req.body.amount !== undefined) transaction.amount = Number(req.body.amount);
    if (req.body.label !== undefined) transaction.label = req.body.label;
    if (req.body.categoryId !== undefined) transaction.categoryId = req.body.categoryId;
    if (req.body.description !== undefined) transaction.description = req.body.description;
    if (req.body.transactionDate !== undefined) {
      transaction.transactionDate = new Date(req.body.transactionDate);
    }
    await transaction.save();
    res.status(HttpStatus.OK).json(transaction);
  } catch (error) {
    sendFinanceError(res, error);
  }
};

const deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });
    if (!transaction) {
      return res.status(HttpStatus.NOT_FOUND).json({ message: 'Transaction not found' });
    }
    res.status(HttpStatus.OK).json({ message: 'Transaction deleted' });
  } catch (error) {
    sendFinanceError(res, error);
  }
};

module.exports = {
  getAllTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
};
