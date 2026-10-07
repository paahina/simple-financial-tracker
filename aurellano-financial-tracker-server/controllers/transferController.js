const Transfer = require('../models/transferModel');
const Account = require('../models/accountModel');
const { HttpStatus } = require('../config/constants');
const { FinanceError, requireOwnedAccount, sendFinanceError } = require('../utils/finance');
const { parsePagination, paginatedResponse } = require('../utils/pagination');

const assertDifferentAccounts = (fromAccountId, toAccountId) => {
  if (String(fromAccountId) === String(toAccountId)) {
    throw new FinanceError('Source and destination accounts must be different');
  }
};

const getAllTransfers = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = { userId: req.user.id };
    const [total, transfers] = await Promise.all([
      Transfer.countDocuments(filter),
      Transfer.find(filter).sort({ transactionDate: -1, createdAt: -1 }).skip(skip).limit(limit),
    ]);
    res.status(HttpStatus.OK).json(paginatedResponse({ data: transfers, total, page, limit }));
  } catch (error) {
    sendFinanceError(res, error);
  }
};

const getTransferById = async (req, res) => {
  try {
    const transfer = await Transfer.findOne({ _id: req.params.id, userId: req.user.id });
    if (!transfer) {
      return res.status(HttpStatus.NOT_FOUND).json({ message: 'Transfer not found' });
    }
    res.status(HttpStatus.OK).json(transfer);
  } catch (error) {
    sendFinanceError(res, error);
  }
};

const createTransfer = async (req, res) => {
  try {
    assertDifferentAccounts(req.body.fromAccountId, req.body.toAccountId);
    await requireOwnedAccount(Account, req.user.id, req.body.fromAccountId, { active: true });
    await requireOwnedAccount(Account, req.user.id, req.body.toAccountId, { active: true });
    const transfer = await Transfer.create({
      userId: req.user.id,
      fromAccountId: req.body.fromAccountId,
      toAccountId: req.body.toAccountId,
      amount: Number(req.body.amount),
      description: req.body.description || '',
      transactionDate: new Date(req.body.transactionDate),
    });
    res.status(HttpStatus.CREATED).json({ message: 'Transfer created', transfer });
  } catch (error) {
    sendFinanceError(res, error);
  }
};

const updateTransfer = async (req, res) => {
  try {
    const transfer = await Transfer.findOne({ _id: req.params.id, userId: req.user.id });
    if (!transfer) {
      return res.status(HttpStatus.NOT_FOUND).json({ message: 'Transfer not found' });
    }
    const fromAccountId = req.body.fromAccountId || transfer.fromAccountId;
    const toAccountId = req.body.toAccountId || transfer.toAccountId;
    assertDifferentAccounts(fromAccountId, toAccountId);
    await requireOwnedAccount(Account, req.user.id, fromAccountId, { active: true });
    await requireOwnedAccount(Account, req.user.id, toAccountId, { active: true });
    if (req.body.fromAccountId !== undefined) transfer.fromAccountId = req.body.fromAccountId;
    if (req.body.toAccountId !== undefined) transfer.toAccountId = req.body.toAccountId;
    if (req.body.amount !== undefined) transfer.amount = Number(req.body.amount);
    if (req.body.description !== undefined) transfer.description = req.body.description;
    if (req.body.transactionDate !== undefined) {
      transfer.transactionDate = new Date(req.body.transactionDate);
    }
    await transfer.save();
    res.status(HttpStatus.OK).json(transfer);
  } catch (error) {
    sendFinanceError(res, error);
  }
};

const deleteTransfer = async (req, res) => {
  try {
    const transfer = await Transfer.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });
    if (!transfer) {
      return res.status(HttpStatus.NOT_FOUND).json({ message: 'Transfer not found' });
    }
    res.status(HttpStatus.OK).json({ message: 'Transfer deleted' });
  } catch (error) {
    sendFinanceError(res, error);
  }
};

module.exports = {
  getAllTransfers,
  getTransferById,
  createTransfer,
  updateTransfer,
  deleteTransfer,
};
