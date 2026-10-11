const Debt = require('../models/debtModel');
const DebtPayment = require('../models/debtPaymentModel');
const Account = require('../models/accountModel');
const Transaction = require('../models/transactionModel');
const { HttpStatus } = require('../config/constants');
const { requireCategory } = require('./categoryController');
const { isPaged, slicePage } = require('../utils/pagination');
const {
  FinanceError,
  debtState,
  debtTotals,
  owedAmount,
  requireOwnedAccount,
  sendFinanceError,
} = require('../utils/finance');

const presentDebt = async (debt) => {
  const paid = await debtTotals(DebtPayment, debt._id);
  const total = owedAmount(debt);
  const state = debtState(total, paid, debt.dueDate);
  if (debt.status !== state.status) {
    debt.status = state.status;
    await debt.save();
  }
  const plain = debt.toObject();
  plain.paidAmount = paid;
  plain.totalAmount = total;
  plain.remainingAmount = state.remaining;
  plain.status = state.status;
  return plain;
};

const requireDebt = async (userId, debtId) => {
  const debt = await Debt.findOne({ _id: debtId, userId });
  if (!debt) {
    throw new FinanceError('Debt not found', HttpStatus.NOT_FOUND);
  }
  return debt;
};

const refreshStatus = async (debt) => presentDebt(debt);

const withIncome = async (userId, payments) => {
  const ids = payments.map((payment) => payment.transactionId).filter(Boolean);
  if (!ids.length) {
    return payments.map((payment) => {
      const plain = payment.toObject ? payment.toObject() : payment;
      return { ...plain, income: null };
    });
  }
  const transactions = await Transaction.find({ _id: { $in: ids }, userId });
  const byId = new Map(transactions.map((item) => [String(item._id), item]));
  return payments.map((payment) => {
    const plain = payment.toObject ? payment.toObject() : payment;
    return { ...plain, income: payment.transactionId ? byId.get(String(payment.transactionId)) || null : null };
  });
};

const requireIncomeFields = (body) => {
  const label = String(body.incomeLabel || '').trim();
  const categoryId = body.incomeCategoryId;
  if (!label || !categoryId) {
    throw new FinanceError('Income label and category are required');
  }
  return { label, categoryId };
};

const createLinkedIncome = async (userId, payment, { label, categoryId }) => {
  await requireCategory(userId, categoryId, 'INCOME');
  return Transaction.create({
    userId,
    accountId: payment.accountId,
    type: 'INCOME',
    amount: payment.amount,
    label,
    categoryId,
    description: payment.notes || '',
    transactionDate: payment.paymentDate,
  });
};

const syncLinkedIncome = async (userId, payment, extras = {}) => {
  if (!payment.transactionId) return;
  const transaction = await Transaction.findOne({ _id: payment.transactionId, userId });
  if (!transaction) {
    payment.transactionId = null;
    return;
  }
  transaction.accountId = payment.accountId;
  transaction.amount = payment.amount;
  transaction.transactionDate = payment.paymentDate;
  transaction.description = payment.notes || '';
  if (extras.label) transaction.label = extras.label;
  if (extras.categoryId) {
    await requireCategory(userId, extras.categoryId, 'INCOME');
    transaction.categoryId = extras.categoryId;
  }
  await transaction.save();
};

const deleteLinkedIncome = async (userId, payment) => {
  if (!payment.transactionId) return;
  await Transaction.deleteOne({ _id: payment.transactionId, userId });
  payment.transactionId = null;
};

const emptyStatusCounts = () => ({
  PENDING: 0,
  PARTIALLY_PAID: 0,
  PAID: 0,
  OVERDUE: 0,
});

const statusCounts = (debts) => {
  const counts = emptyStatusCounts();
  debts.forEach((debt) => {
    if (counts[debt.status] !== undefined) counts[debt.status] += 1;
  });
  return counts;
};

const getAllDebts = async (req, res) => {
  try {
    const filter = { userId: req.user.id };
    const debts = await Debt.find(filter).sort({ dueDate: 1 });
    const presented = await Promise.all(debts.map(presentDebt));
    if (!isPaged(req.query)) {
      const filtered = req.query.status
        ? presented.filter((debt) => debt.status === req.query.status)
        : presented;
      res.status(HttpStatus.OK).json(filtered);
      return;
    }
    const filtered = req.query.status
      ? presented.filter((debt) => debt.status === req.query.status)
      : presented;
    res.status(HttpStatus.OK).json({
      ...slicePage(filtered, req.query),
      counts: statusCounts(presented),
    });
  } catch (error) {
    sendFinanceError(res, error);
  }
};

const getDebtById = async (req, res) => {
  try {
    const debt = await requireDebt(req.user.id, req.params.id);
    const payments = await withIncome(
      req.user.id,
      await DebtPayment.find({ debtId: debt._id, userId: req.user.id }).sort({
        paymentDate: -1,
      }),
    );
    const presented = await presentDebt(debt);
    if (req.query.additionsPage || req.query.paymentsPage) {
      res.status(HttpStatus.OK).json({
        debt: presented,
        additions: slicePage(presented.additions || [], req.query, 'additionsPage', 'additionsLimit'),
        payments: slicePage(payments, req.query, 'paymentsPage', 'paymentsLimit'),
      });
      return;
    }
    res.status(HttpStatus.OK).json({ debt: presented, payments });
  } catch (error) {
    sendFinanceError(res, error);
  }
};

const createDebt = async (req, res) => {
  try {
    const debt = await Debt.create({
      userId: req.user.id,
      personName: req.body.personName,
      description: req.body.description || '',
      originalAmount: Number(req.body.originalAmount),
      dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
      status: 'PENDING',
    });
    res.status(HttpStatus.CREATED).json({
      message: 'Debt created',
      debt: await presentDebt(debt),
    });
  } catch (error) {
    sendFinanceError(res, error);
  }
};

const updateDebt = async (req, res) => {
  try {
    const debt = await requireDebt(req.user.id, req.params.id);
    if (req.body.personName !== undefined) debt.personName = req.body.personName;
    if (req.body.description !== undefined) debt.description = req.body.description;
    if (req.body.dueDate !== undefined) {
      debt.dueDate = req.body.dueDate ? new Date(req.body.dueDate) : null;
    }
    if (req.body.originalAmount !== undefined) {
      debt.originalAmount = Number(req.body.originalAmount);
    }
    const paid = await debtTotals(DebtPayment, debt._id);
    if (owedAmount(debt) < paid) {
      throw new FinanceError('Amount owed cannot be less than recorded payments');
    }
    await debt.save();
    res.status(HttpStatus.OK).json(await presentDebt(debt));
  } catch (error) {
    sendFinanceError(res, error);
  }
};

const requireAddition = async (userId, additionId) => {
  const debt = await Debt.findOne({ userId, 'additions._id': additionId });
  if (!debt) {
    throw new FinanceError('Added amount not found', HttpStatus.NOT_FOUND);
  }
  return { debt, line: debt.additions.id(additionId) };
};

const assertOwedCoversPayments = async (debt) => {
  const paid = await debtTotals(DebtPayment, debt._id);
  if (owedAmount(debt) < paid) {
    throw new FinanceError('Amount owed cannot be less than recorded payments');
  }
};

const createAddition = async (req, res) => {
  try {
    const debt = await requireDebt(req.user.id, req.body.debtId);
    debt.additions.push({
      label: String(req.body.label).trim(),
      amount: Number(req.body.amount),
      createdAt: new Date(req.body.createdAt),
    });
    await assertOwedCoversPayments(debt);
    await debt.save();
    res.status(HttpStatus.CREATED).json(await presentDebt(debt));
  } catch (error) {
    sendFinanceError(res, error);
  }
};

const updateAddition = async (req, res) => {
  try {
    const { debt, line } = await requireAddition(req.user.id, req.params.id);
    if (req.body.label !== undefined) line.label = String(req.body.label).trim();
    if (req.body.amount !== undefined) line.amount = Number(req.body.amount);
    if (req.body.createdAt !== undefined) line.createdAt = new Date(req.body.createdAt);
    await assertOwedCoversPayments(debt);
    await debt.save();
    res.status(HttpStatus.OK).json(await presentDebt(debt));
  } catch (error) {
    sendFinanceError(res, error);
  }
};

const deleteAddition = async (req, res) => {
  try {
    const { debt, line } = await requireAddition(req.user.id, req.params.id);
    line.deleteOne();
    await assertOwedCoversPayments(debt);
    await debt.save();
    res.status(HttpStatus.OK).json(await presentDebt(debt));
  } catch (error) {
    sendFinanceError(res, error);
  }
};

const deleteDebt = async (req, res) => {
  try {
    const debt = await requireDebt(req.user.id, req.params.id);
    const payments = await DebtPayment.countDocuments({ debtId: debt._id });
    if (payments > 0) {
      throw new FinanceError('Delete the debt payments before deleting the debt');
    }
    await debt.deleteOne();
    res.status(HttpStatus.OK).json({ message: 'Debt deleted' });
  } catch (error) {
    sendFinanceError(res, error);
  }
};

const getDebtPayments = async (req, res) => {
  try {
    await requireDebt(req.user.id, req.params.id);
    const payments = await DebtPayment.find({
      debtId: req.params.id,
      userId: req.user.id,
    }).sort({ paymentDate: -1 });
    res.status(HttpStatus.OK).json(payments);
  } catch (error) {
    sendFinanceError(res, error);
  }
};

const createDebtPayment = async (req, res) => {
  try {
    const debt = await requireDebt(req.user.id, req.body.debtId);
    await requireOwnedAccount(Account, req.user.id, req.body.accountId, { active: true });
    const paid = await debtTotals(DebtPayment, debt._id);
    const remaining = owedAmount(debt) - paid;
    const amount = Number(req.body.amount);
    if (amount > remaining) {
      throw new FinanceError('Payment cannot be greater than the remaining debt');
    }
    const payment = await DebtPayment.create({
      userId: req.user.id,
      debtId: debt._id,
      accountId: req.body.accountId,
      amount,
      paymentDate: new Date(req.body.paymentDate),
      notes: req.body.notes || '',
    });
    if (req.body.recordAsIncome === true) {
      try {
        const fields = requireIncomeFields(req.body);
        const income = await createLinkedIncome(req.user.id, payment, fields);
        payment.transactionId = income._id;
        await payment.save();
      } catch (error) {
        await payment.deleteOne();
        throw error;
      }
    }
    const [presented] = await withIncome(req.user.id, [payment]);
    res.status(HttpStatus.CREATED).json({
      message: 'Debt payment recorded',
      payment: presented,
      debt: await refreshStatus(debt),
    });
  } catch (error) {
    sendFinanceError(res, error);
  }
};

const updateDebtPayment = async (req, res) => {
  try {
    const payment = await DebtPayment.findOne({ _id: req.params.id, userId: req.user.id });
    if (!payment) {
      return res.status(HttpStatus.NOT_FOUND).json({ message: 'Debt payment not found' });
    }
    const debt = await requireDebt(req.user.id, payment.debtId);
    const nextAccountId = req.body.accountId || payment.accountId;
    await requireOwnedAccount(Account, req.user.id, nextAccountId, {
      active: String(nextAccountId) !== String(payment.accountId),
    });
    const paid = await debtTotals(DebtPayment, debt._id);
    const nextAmount = req.body.amount !== undefined ? Number(req.body.amount) : payment.amount;
    const remainingWithoutThis = owedAmount(debt) - (paid - payment.amount);
    if (nextAmount > remainingWithoutThis) {
      throw new FinanceError('Payment cannot be greater than the remaining debt');
    }
    if (req.body.accountId !== undefined) payment.accountId = req.body.accountId;
    if (req.body.amount !== undefined) payment.amount = nextAmount;
    if (req.body.paymentDate !== undefined) payment.paymentDate = new Date(req.body.paymentDate);
    if (req.body.notes !== undefined) payment.notes = req.body.notes;
    if (req.body.recordAsIncome === true) {
      const fields = requireIncomeFields(req.body);
      if (payment.transactionId) {
        await syncLinkedIncome(req.user.id, payment, fields);
      } else {
        const income = await createLinkedIncome(req.user.id, payment, fields);
        payment.transactionId = income._id;
      }
    } else if (req.body.recordAsIncome === false) {
      await deleteLinkedIncome(req.user.id, payment);
    } else {
      await syncLinkedIncome(req.user.id, payment);
    }
    await payment.save();
    const [presented] = await withIncome(req.user.id, [payment]);
    res.status(HttpStatus.OK).json({ payment: presented, debt: await refreshStatus(debt) });
  } catch (error) {
    sendFinanceError(res, error);
  }
};

const deleteDebtPayment = async (req, res) => {
  try {
    const payment = await DebtPayment.findOne({ _id: req.params.id, userId: req.user.id });
    if (!payment) {
      return res.status(HttpStatus.NOT_FOUND).json({ message: 'Debt payment not found' });
    }
    await deleteLinkedIncome(req.user.id, payment);
    await payment.deleteOne();
    const debt = await requireDebt(req.user.id, payment.debtId);
    res.status(HttpStatus.OK).json({
      message: 'Debt payment deleted',
      debt: await refreshStatus(debt),
    });
  } catch (error) {
    sendFinanceError(res, error);
  }
};

module.exports = {
  getAllDebts,
  getDebtById,
  createDebt,
  updateDebt,
  createAddition,
  updateAddition,
  deleteAddition,
  deleteDebt,
  getDebtPayments,
  createDebtPayment,
  updateDebtPayment,
  deleteDebtPayment,
};
