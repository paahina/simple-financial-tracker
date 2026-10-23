const { Types } = require('mongoose');
const Account = require('../models/accountModel');
const Category = require('../models/categoryModel');
const ToBuy = require('../models/toBuyModel');
const Transaction = require('../models/transactionModel');
const { HttpStatus } = require('../config/constants');
const { ensureDefaultCategories } = require('./categoryController');
const {
  FinanceError,
  applySubBalanceDelta,
  pocketDeltaForType,
  requireOwnedAccount,
  resolvePocketId,
  sendFinanceError,
} = require('../utils/finance');
const { isPaged, parsePagination, paginatedResponse } = require('../utils/pagination');

const requireItem = async (userId, id) => {
  const item = await ToBuy.findOne({ _id: id, userId });
  if (!item) {
    throw new FinanceError('To-buy item not found', HttpStatus.NOT_FOUND);
  }
  return item;
};

const estimatedTotalFor = async (userId) => {
  const [row] = await ToBuy.aggregate([
    { $match: { userId: new Types.ObjectId(String(userId)) } },
    {
      $group: {
        _id: null,
        total: { $sum: { $multiply: ['$quantity', '$unitPrice'] } },
      },
    },
  ]);
  return row?.total || 0;
};

const resolveShoppingCategory = async (userId) => {
  await ensureDefaultCategories(userId);
  const shopping = await Category.findOne({
    userId,
    type: 'EXPENSE',
    isActive: true,
    name: 'Shopping',
  });
  if (shopping) return shopping;
  const fallback = await Category.findOne({ userId, type: 'EXPENSE', isActive: true }).sort({ name: 1 });
  if (!fallback) {
    throw new FinanceError('Add an expense category first');
  }
  return fallback;
};

const getAllToBuy = async (req, res) => {
  try {
    const filter = { userId: req.user.id };
    const sort = { createdAt: -1 };
    const estimatedTotal = await estimatedTotalFor(req.user.id);
    if (!isPaged(req.query)) {
      const items = await ToBuy.find(filter).sort(sort);
      res.status(HttpStatus.OK).json({ data: items, estimatedTotal });
      return;
    }
    const { page, limit, skip } = parsePagination(req.query);
    const [total, items] = await Promise.all([
      ToBuy.countDocuments(filter),
      ToBuy.find(filter).sort(sort).skip(skip).limit(limit),
    ]);
    res.status(HttpStatus.OK).json({
      ...paginatedResponse({ data: items, total, page, limit }),
      estimatedTotal,
    });
  } catch (error) {
    sendFinanceError(res, error);
  }
};

const getToBuyById = async (req, res) => {
  try {
    const item = await requireItem(req.user.id, req.params.id);
    res.status(HttpStatus.OK).json(item);
  } catch (error) {
    sendFinanceError(res, error);
  }
};

const createToBuy = async (req, res) => {
  try {
    const item = await ToBuy.create({
      userId: req.user.id,
      name: req.body.name,
      quantity: Number(req.body.quantity),
      unitPrice: Number(req.body.unitPrice),
      notes: req.body.notes || '',
    });
    res.status(HttpStatus.CREATED).json({ message: 'To-buy item created', item });
  } catch (error) {
    sendFinanceError(res, error);
  }
};

const updateToBuy = async (req, res) => {
  try {
    const item = await requireItem(req.user.id, req.params.id);
    item.name = req.body.name;
    item.quantity = Number(req.body.quantity);
    item.unitPrice = Number(req.body.unitPrice);
    item.notes = req.body.notes ?? item.notes;
    await item.save();
    res.status(HttpStatus.OK).json({ message: 'To-buy item updated', item });
  } catch (error) {
    sendFinanceError(res, error);
  }
};

const deleteToBuy = async (req, res) => {
  try {
    const item = await requireItem(req.user.id, req.params.id);
    await item.deleteOne();
    res.status(HttpStatus.OK).json({ message: 'To-buy item deleted' });
  } catch (error) {
    sendFinanceError(res, error);
  }
};

const completeToBuy = async (req, res) => {
  try {
    const item = await requireItem(req.user.id, req.params.id);
    const account = await requireOwnedAccount(Account, req.user.id, req.body.accountId, { active: true });
    const category = await resolveShoppingCategory(req.user.id);
    const amount = Number(req.body.amount);
    const subBalanceId = resolvePocketId(account, req.body.subBalanceId || null);
    applySubBalanceDelta(account, subBalanceId, pocketDeltaForType('EXPENSE', amount));
    await account.save();
    const transaction = await Transaction.create({
      userId: req.user.id,
      accountId: account._id,
      subBalanceId,
      type: 'EXPENSE',
      amount,
      label: item.name,
      categoryId: category._id,
      description: item.notes || '',
      transactionDate: new Date(),
    });
    await item.deleteOne();
    res.status(HttpStatus.CREATED).json({ message: 'Purchase recorded', transaction });
  } catch (error) {
    sendFinanceError(res, error);
  }
};

module.exports = {
  getAllToBuy,
  getToBuyById,
  createToBuy,
  updateToBuy,
  deleteToBuy,
  completeToBuy,
};
