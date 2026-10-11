const { Types } = require('mongoose');
const Transfer = require('../models/transferModel');
const Account = require('../models/accountModel');
const { HttpStatus } = require('../config/constants');
const {
  FinanceError,
  applyTransferPockets,
  assertTransferTargets,
  requireOwnedAccount,
  resolvePocketId,
  sendFinanceError,
} = require('../utils/finance');
const { parsePagination, paginatedResponse } = require('../utils/pagination');
const { listActivityDays } = require('../utils/dayGroups');

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
  return { from, to };
};

const pocketFor = (account, requestedId) => resolvePocketId(account, requestedId || null);

const loadTransferAccounts = async (userId, parties, previous = {}) => {
  const fromAccount = parties.from.accountId
    ? await requireOwnedAccount(Account, userId, parties.from.accountId, {
        active: String(parties.from.accountId) !== String(previous.fromAccountId || ''),
      })
    : null;
  const toAccount = parties.to.accountId
    ? await requireOwnedAccount(Account, userId, parties.to.accountId, {
        active: String(parties.to.accountId) !== String(previous.toAccountId || ''),
      })
    : null;
  return { fromAccount, toAccount };
};

const getTransferDays = async (req, res) => {
  try {
    const body = await listActivityDays(
      Transfer,
      { userId: new Types.ObjectId(req.user.id) },
      req.query,
      { kind: 'transfer' },
    );
    res.status(HttpStatus.OK).json(body);
  } catch (error) {
    sendFinanceError(res, error);
  }
};

const getAllTransfers = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = { userId: req.user.id };
    if (req.query.startDate || req.query.endDate) {
      filter.transactionDate = {};
      if (req.query.startDate) filter.transactionDate.$gte = new Date(req.query.startDate);
      if (req.query.endDate) filter.transactionDate.$lte = new Date(req.query.endDate);
    }
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
    const { fromAccount, toAccount } = await loadTransferAccounts(req.user.id, parties);
    const fromSubBalanceId = pocketFor(fromAccount, req.body.fromSubBalanceId || null);
    const toSubBalanceId = pocketFor(toAccount, req.body.toSubBalanceId || null);
    assertTransferTargets(fromAccount, fromSubBalanceId, toAccount, toSubBalanceId);
    const amount = Number(req.body.amount);
    await applyTransferPockets(fromAccount, fromSubBalanceId, toAccount, toSubBalanceId, amount, 1);
    const transfer = await Transfer.create({
      userId: req.user.id,
      fromAccountId: parties.from.accountId || undefined,
      fromSubBalanceId,
      senderName: parties.from.name,
      toAccountId: parties.to.accountId || undefined,
      toSubBalanceId,
      recipientName: parties.to.name,
      amount,
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
    const previousFrom = await (transfer.fromAccountId
      ? requireOwnedAccount(Account, req.user.id, transfer.fromAccountId)
      : Promise.resolve(null));
    const previousTo =
      transfer.toAccountId && String(transfer.toAccountId) === String(transfer.fromAccountId)
        ? previousFrom
        : transfer.toAccountId
          ? await requireOwnedAccount(Account, req.user.id, transfer.toAccountId)
          : null;
    await applyTransferPockets(
      previousFrom,
      transfer.fromSubBalanceId,
      previousTo,
      transfer.toSubBalanceId,
      transfer.amount,
      -1,
    );
    const { fromAccount, toAccount } = await loadTransferAccounts(req.user.id, parties, {
      fromAccountId: transfer.fromAccountId,
      toAccountId: transfer.toAccountId,
    });
    const nextFromSub =
      req.body.fromSubBalanceId !== undefined ? req.body.fromSubBalanceId || null : transfer.fromSubBalanceId;
    const nextToSub =
      req.body.toSubBalanceId !== undefined ? req.body.toSubBalanceId || null : transfer.toSubBalanceId;
    const fromSubBalanceId = pocketFor(fromAccount, nextFromSub);
    const toSubBalanceId = pocketFor(toAccount, nextToSub);
    assertTransferTargets(fromAccount, fromSubBalanceId, toAccount, toSubBalanceId);
    const nextAmount = req.body.amount !== undefined ? Number(req.body.amount) : transfer.amount;
    await applyTransferPockets(fromAccount, fromSubBalanceId, toAccount, toSubBalanceId, nextAmount, 1);
    transfer.set('fromAccountId', parties.from.accountId || undefined);
    transfer.fromSubBalanceId = fromSubBalanceId;
    transfer.senderName = parties.from.name;
    transfer.set('toAccountId', parties.to.accountId || undefined);
    transfer.toSubBalanceId = toSubBalanceId;
    transfer.recipientName = parties.to.name;
    if (req.body.amount !== undefined) transfer.amount = nextAmount;
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
    const transfer = await Transfer.findOne({ _id: req.params.id, userId: req.user.id });
    if (!transfer) {
      return res.status(HttpStatus.NOT_FOUND).json({ message: 'Transfer not found' });
    }
    const fromAccount = transfer.fromAccountId
      ? await requireOwnedAccount(Account, req.user.id, transfer.fromAccountId)
      : null;
    const toAccount =
      transfer.toAccountId && String(transfer.toAccountId) === String(transfer.fromAccountId)
        ? fromAccount
        : transfer.toAccountId
          ? await requireOwnedAccount(Account, req.user.id, transfer.toAccountId)
          : null;
    await applyTransferPockets(
      fromAccount,
      transfer.fromSubBalanceId,
      toAccount,
      transfer.toSubBalanceId,
      transfer.amount,
      -1,
    );
    await transfer.deleteOne();
    res.status(HttpStatus.OK).json({ message: 'Transfer deleted' });
  } catch (error) {
    sendFinanceError(res, error);
  }
};

module.exports = {
  getAllTransfers,
  getTransferDays,
  getTransferById,
  createTransfer,
  updateTransfer,
  deleteTransfer,
};
