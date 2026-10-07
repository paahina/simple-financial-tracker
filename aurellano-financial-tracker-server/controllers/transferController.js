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

const resolveParty = (accountId, name, missingMessage) => {
  const id = accountId || null;
  const label = String(name || '').trim();
  if (id && label) {
    throw new FinanceError('Choose an account or a name');
  }
  if (!id && label.length < 2) {
    throw new FinanceError(missingMessage);
  }
  return { accountId: id, name: id ? '' : label };
};

const resolveParties = ({ fromAccountId, senderName, toAccountId, recipientName }) => {
  const from = resolveParty(fromAccountId, senderName, 'Sender name is required');
  const to = resolveParty(toAccountId, recipientName, 'Recipient name is required');
  if (!from.accountId && !to.accountId) {
    throw new FinanceError('One side must be one of your accounts');
  }
  if (from.accountId && to.accountId) {
    assertDifferentAccounts(from.accountId, to.accountId);
  }
  return { from, to };
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
    const parties = resolveParties(req.body);
    if (parties.from.accountId) {
      await requireOwnedAccount(Account, req.user.id, parties.from.accountId, { active: true });
    }
    if (parties.to.accountId) {
      await requireOwnedAccount(Account, req.user.id, parties.to.accountId, { active: true });
    }
    const transfer = await Transfer.create({
      userId: req.user.id,
      fromAccountId: parties.from.accountId || undefined,
      senderName: parties.from.name,
      toAccountId: parties.to.accountId || undefined,
      recipientName: parties.to.name,
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
    const parties = resolveParties({
      fromAccountId: req.body.fromAccountId !== undefined ? req.body.fromAccountId : transfer.fromAccountId,
      senderName: req.body.senderName !== undefined ? req.body.senderName : transfer.senderName,
      toAccountId: req.body.toAccountId !== undefined ? req.body.toAccountId : transfer.toAccountId,
      recipientName: req.body.recipientName !== undefined ? req.body.recipientName : transfer.recipientName,
    });
    if (parties.from.accountId) {
      await requireOwnedAccount(Account, req.user.id, parties.from.accountId, { active: true });
    }
    if (parties.to.accountId) {
      await requireOwnedAccount(Account, req.user.id, parties.to.accountId, { active: true });
    }
    transfer.set('fromAccountId', parties.from.accountId || undefined);
    transfer.senderName = parties.from.name;
    transfer.set('toAccountId', parties.to.accountId || undefined);
    transfer.recipientName = parties.to.name;
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
