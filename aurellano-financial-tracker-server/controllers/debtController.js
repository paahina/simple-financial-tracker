const Debt = require('../models/debtModel');
const DebtPayment = require('../models/debtPaymentModel');
const Account = require('../models/accountModel');
const { HttpStatus } = require('../config/constants');
const {
  FinanceError,
  debtState,
  debtTotals,
  requireOwnedAccount,
  sendFinanceError,
} = require('../utils/finance');

const presentDebt = async (debt) => {
  const paid = await debtTotals(DebtPayment, debt._id);
  const state = debtState(debt.originalAmount, paid, debt.dueDate);
  if (debt.status !== state.status) {
    debt.status = state.status;
    await debt.save();
  }
  const plain = debt.toObject();
  plain.paidAmount = paid;
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

const getAllDebts = async (req, res) => {
  try {
    const debts = await Debt.find({ userId: req.user.id }).sort({ dueDate: 1 });
    const presented = await Promise.all(debts.map(presentDebt));
    const filtered = req.query.status
      ? presented.filter((debt) => debt.status === req.query.status)
      : presented;
    res.status(HttpStatus.OK).json(filtered);
  } catch (error) {
    sendFinanceError(res, error);
  }
};

const getDebtById = async (req, res) => {
  try {
    const debt = await requireDebt(req.user.id, req.params.id);
    const payments = await DebtPayment.find({ debtId: debt._id, userId: req.user.id }).sort({
      paymentDate: -1,
    });
    res.status(HttpStatus.OK).json({ debt: await presentDebt(debt), payments });
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
      const paid = await debtTotals(DebtPayment, debt._id);
      if (Number(req.body.originalAmount) < paid) {
        throw new FinanceError('Original amount cannot be less than recorded payments');
      }
      debt.originalAmount = Number(req.body.originalAmount);
    }
    if (req.body.additionalAmount !== undefined) {
      debt.originalAmount += Number(req.body.additionalAmount);
    }
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
    const remaining = debt.originalAmount - paid;
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
    res.status(HttpStatus.CREATED).json({
      message: 'Debt payment recorded',
      payment,
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
    await requireOwnedAccount(Account, req.user.id, nextAccountId, { active: true });
    const paid = await debtTotals(DebtPayment, debt._id);
    const nextAmount = req.body.amount !== undefined ? Number(req.body.amount) : payment.amount;
    const remainingWithoutThis = debt.originalAmount - (paid - payment.amount);
    if (nextAmount > remainingWithoutThis) {
      throw new FinanceError('Payment cannot be greater than the remaining debt');
    }
    if (req.body.accountId !== undefined) payment.accountId = req.body.accountId;
    if (req.body.amount !== undefined) payment.amount = nextAmount;
    if (req.body.paymentDate !== undefined) payment.paymentDate = new Date(req.body.paymentDate);
    if (req.body.notes !== undefined) payment.notes = req.body.notes;
    await payment.save();
    res.status(HttpStatus.OK).json({ payment, debt: await refreshStatus(debt) });
  } catch (error) {
    sendFinanceError(res, error);
  }
};

const deleteDebtPayment = async (req, res) => {
  try {
    const payment = await DebtPayment.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });
    if (!payment) {
      return res.status(HttpStatus.NOT_FOUND).json({ message: 'Debt payment not found' });
    }
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
  deleteDebt,
  getDebtPayments,
  createDebtPayment,
  updateDebtPayment,
  deleteDebtPayment,
};
