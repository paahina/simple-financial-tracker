const Debt = require('../models/debtModel');
const DebtPayment = require('../models/debtPaymentModel');
const Account = require('../models/accountModel');
const Transaction = require('../models/transactionModel');
const { HttpStatus } = require('../config/constants');
const { requireCategory } = require('./categoryController');
const { isPaged, slicePage } = require('../utils/pagination');
const {
  FinanceError,
  applySubBalanceDelta,
  categoryRemaining,
  debtState,
  debtTotals,
  effectiveDebtDueDate,
  normalizeDebtCategories,
  normalizeParticipants,
  owedAmount,
  participantRemaining,
  presentDebtCategories,
  presentParticipants,
  requireOwnedAccount,
  resolveCategoryId,
  resolveParticipantId,
  resolvePocketId,
  sendFinanceError,
} = require('../utils/finance');

const presentDebt = async (debt) => {
  const payments = await DebtPayment.find({ debtId: debt._id, userId: debt.userId }).select(
    'amount categoryId participantId',
  );
  const paid = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const total = owedAmount(debt);
  const categories = presentDebtCategories(debt, payments);
  const presentedParticipants = presentParticipants(debt, payments);
  const dueDate = effectiveDebtDueDate(categories, debt.dueDate);
  const state = debtState(total, paid, dueDate);
  if (debt.status !== state.status) {
    debt.status = state.status;
    await debt.save();
  }
  const plain = debt.toObject();
  plain.paidAmount = paid;
  plain.totalAmount = total;
  plain.remainingAmount = state.remaining;
  plain.status = state.status;
  plain.categories = categories;
  plain.participants = presentedParticipants;
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

const isPayableDebt = (debt) => debt.direction === 'PAYABLE';

const paymentCashDelta = (debt, amount) =>
  isPayableDebt(debt) ? -Number(amount) : Number(amount);

const withLinkedTransactions = async (userId, payments) => {
  const ids = payments.map((payment) => payment.transactionId).filter(Boolean);
  if (!ids.length) {
    return payments.map((payment) => {
      const plain = payment.toObject ? payment.toObject() : payment;
      return { ...plain, income: null, expense: null };
    });
  }
  const transactions = await Transaction.find({ _id: { $in: ids }, userId });
  const byId = new Map(transactions.map((item) => [String(item._id), item]));
  return payments.map((payment) => {
    const plain = payment.toObject ? payment.toObject() : payment;
    const linked = payment.transactionId ? byId.get(String(payment.transactionId)) || null : null;
    return {
      ...plain,
      income: linked?.type === 'INCOME' ? linked : null,
      expense: linked?.type === 'EXPENSE' ? linked : null,
    };
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

const requireExpenseFields = (body) => {
  const label = String(body.expenseLabel || '').trim();
  const categoryId = body.expenseCategoryId;
  if (!label || !categoryId) {
    throw new FinanceError('Expense label and category are required');
  }
  return { label, categoryId };
};

const createLinkedIncome = async (userId, payment, { label, categoryId }) => {
  await requireCategory(userId, categoryId, 'INCOME');
  return Transaction.create({
    userId,
    accountId: payment.accountId,
    subBalanceId: payment.subBalanceId,
    type: 'INCOME',
    amount: payment.amount,
    label,
    categoryId,
    description: payment.notes || '',
    transactionDate: payment.paymentDate,
  });
};

const createLinkedExpense = async (userId, payment, { label, categoryId }) => {
  await requireCategory(userId, categoryId, 'EXPENSE');
  return Transaction.create({
    userId,
    accountId: payment.accountId,
    subBalanceId: payment.subBalanceId,
    type: 'EXPENSE',
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
  transaction.subBalanceId = payment.subBalanceId;
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

const syncLinkedExpense = async (userId, payment, extras = {}) => {
  if (!payment.transactionId) return;
  const transaction = await Transaction.findOne({ _id: payment.transactionId, userId });
  if (!transaction) {
    payment.transactionId = null;
    return;
  }
  transaction.accountId = payment.accountId;
  transaction.subBalanceId = payment.subBalanceId;
  transaction.amount = payment.amount;
  transaction.transactionDate = payment.paymentDate;
  transaction.description = payment.notes || '';
  if (extras.label) transaction.label = extras.label;
  if (extras.categoryId) {
    await requireCategory(userId, extras.categoryId, 'EXPENSE');
    transaction.categoryId = extras.categoryId;
  }
  await transaction.save();
};

const deleteLinkedTransaction = async (userId, payment) => {
  if (!payment.transactionId) return;
  await Transaction.deleteOne({ _id: payment.transactionId, userId });
  payment.transactionId = null;
};

const deleteLinkedIncome = async (userId, payment) => deleteLinkedTransaction(userId, payment);

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

const debtDirection = (debt) => (debt.direction === 'PAYABLE' ? 'PAYABLE' : 'RECEIVABLE');

const getAllDebts = async (req, res) => {
  try {
    const direction = req.query.direction === 'PAYABLE' ? 'PAYABLE' : 'RECEIVABLE';
    const debts = await Debt.find({ userId: req.user.id }).sort({ dueDate: 1 });
    const presented = await Promise.all(debts.map(presentDebt));
    const forDirection = presented.filter((debt) => debtDirection(debt) === direction);
    const directionTotals = {
      RECEIVABLE: presented.filter((debt) => debtDirection(debt) === 'RECEIVABLE').length,
      PAYABLE: presented.filter((debt) => debtDirection(debt) === 'PAYABLE').length,
    };
    if (!isPaged(req.query)) {
      const filtered = req.query.status
        ? forDirection.filter((debt) => debt.status === req.query.status)
        : forDirection;
      res.status(HttpStatus.OK).json(filtered);
      return;
    }
    const filtered = req.query.status
      ? forDirection.filter((debt) => debt.status === req.query.status)
      : forDirection;
    res.status(HttpStatus.OK).json({
      ...slicePage(filtered, req.query),
      counts: statusCounts(forDirection),
      directionTotals,
    });
  } catch (error) {
    sendFinanceError(res, error);
  }
};

const getDebtById = async (req, res) => {
  try {
    const debt = await requireDebt(req.user.id, req.params.id);
    const payments = await withLinkedTransactions(
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
    const kind = req.body.kind === 'CONTRIBUTION' ? 'CONTRIBUTION' : 'INDIVIDUAL';
    const direction = req.body.direction === 'PAYABLE' ? 'PAYABLE' : 'RECEIVABLE';
    let originalAmount = Number(req.body.originalAmount);
    let additions = [];
    if (kind === 'INDIVIDUAL' && Array.isArray(req.body.subBalances)) {
      additions = normalizeDebtCategories(req.body.subBalances);
      originalAmount = 0;
      const total = additions.reduce((sum, line) => sum + line.amount, 0);
      if (total < 1) {
        throw new FinanceError('Amount owed is required');
      }
    } else if (!Number.isInteger(originalAmount) || originalAmount < 1) {
      throw new FinanceError('Amount owed is required');
    }
    const participants =
      kind === 'CONTRIBUTION' ? normalizeParticipants(req.body.participants, originalAmount) : [];
    const debt = await Debt.create({
      userId: req.user.id,
      personName: req.body.personName,
      kind,
      direction,
      description: req.body.description || '',
      originalAmount,
      additions,
      participants,
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
    if (Array.isArray(req.body.subBalances)) {
      if (debt.kind === 'CONTRIBUTION') {
        throw new FinanceError('A contribution cannot have labeled balances');
      }
      const next = normalizeDebtCategories(req.body.subBalances);
      const total = next.reduce((sum, line) => sum + line.amount, 0);
      if (total < 1) {
        throw new FinanceError('Amount owed is required');
      }
      const kept = new Set(next.map((line) => line._id).filter(Boolean).map(String));
      const removed = (debt.additions || []).filter((line) => !kept.has(String(line._id)));
      if (removed.length) {
        const used = await DebtPayment.countDocuments({
          debtId: debt._id,
          userId: debt.userId,
          categoryId: { $in: removed.map((line) => line._id) },
        });
        if (used) {
          throw new FinanceError('A balance with payments cannot be removed');
        }
      }
      debt.additions = next;
      debt.originalAmount = 0;
    }
    if (Array.isArray(req.body.participants)) {
      if (debt.kind !== 'CONTRIBUTION') {
        throw new FinanceError('Only a contribution can have payers');
      }
      debt.participants = normalizeParticipants(req.body.participants, Number(debt.originalAmount));
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

const addToBalance = async (req, res) => {
  try {
    const debt = await requireDebt(req.user.id, req.body.debtId);
    if (debt.kind !== 'INDIVIDUAL') {
      throw new FinanceError('Only individual debts have balances');
    }
    if (!(Number(debt.originalAmount) > 0) && !(debt.additions || []).length) {
      throw new FinanceError('No balances to add to');
    }
    const increment = Number(req.body.amount);
    const categoryId = resolveCategoryId(debt, req.body.categoryId || null);
    if (categoryId) {
      const line = debt.additions.id(categoryId);
      if (!line) throw new FinanceError('Balance not found', HttpStatus.NOT_FOUND);
      line.amount = Number(line.amount) + increment;
    } else {
      debt.originalAmount = Number(debt.originalAmount) + increment;
    }
    await debt.save();
    res.status(HttpStatus.OK).json(await presentDebt(debt));
  } catch (error) {
    sendFinanceError(res, error);
  }
};

const createAddition = async (req, res) => {
  try {
    const debt = await requireDebt(req.user.id, req.body.debtId);
    debt.additions.push({
      label: String(req.body.label).trim(),
      amount: Number(req.body.amount),
      dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
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
    if (req.body.dueDate !== undefined) line.dueDate = req.body.dueDate ? new Date(req.body.dueDate) : null;
    if (req.body.createdAt !== undefined) line.createdAt = new Date(req.body.createdAt);
    const payments = await DebtPayment.find({ debtId: debt._id, userId: debt.userId }).select(
      'amount categoryId',
    );
    const paidOnLine = payments
      .filter((payment) => payment.categoryId && String(payment.categoryId) === String(line._id))
      .reduce((sum, payment) => sum + Number(payment.amount), 0);
    if (Number(line.amount) < paidOnLine) {
      throw new FinanceError('Category amount cannot be less than recorded payments');
    }
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
    const used = await DebtPayment.countDocuments({
      debtId: debt._id,
      userId: debt.userId,
      categoryId: line._id,
    });
    if (used) {
      throw new FinanceError('A category with payments cannot be removed');
    }
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

const applyPaymentPocket = async (account, subBalanceId, debt, amount) => {
  applySubBalanceDelta(account, subBalanceId, paymentCashDelta(debt, amount));
  await account.save();
};

const assertRecordAsFlags = (debt, body) => {
  if (body.recordAsIncome === true && isPayableDebt(debt)) {
    throw new FinanceError('Payable payments cannot be recorded as income');
  }
  if (body.recordAsExpense === true && !isPayableDebt(debt)) {
    throw new FinanceError('Receivable payments cannot be recorded as expense');
  }
  if (body.recordAsIncome === true && body.recordAsExpense === true) {
    throw new FinanceError('Choose either income or expense, not both');
  }
};

const syncPaymentLinkedTransaction = async (userId, debt, payment, body) => {
  if (isPayableDebt(debt)) {
    if (body.recordAsExpense === true) {
      const fields = requireExpenseFields(body);
      if (payment.transactionId) {
        await syncLinkedExpense(userId, payment, fields);
      } else {
        const expense = await createLinkedExpense(userId, payment, fields);
        payment.transactionId = expense._id;
      }
      return;
    }
    if (body.recordAsExpense === false) {
      await deleteLinkedTransaction(userId, payment);
      return;
    }
    if (payment.transactionId) {
      await syncLinkedExpense(userId, payment);
    }
    return;
  }
  if (body.recordAsIncome === true) {
    const fields = requireIncomeFields(body);
    if (payment.transactionId) {
      await syncLinkedIncome(userId, payment, fields);
    } else {
      const income = await createLinkedIncome(userId, payment, fields);
      payment.transactionId = income._id;
    }
    return;
  }
  if (body.recordAsIncome === false) {
    await deleteLinkedTransaction(userId, payment);
    return;
  }
  if (payment.transactionId) {
    await syncLinkedIncome(userId, payment);
  }
};

const createDebtPayment = async (req, res) => {
  try {
    const debt = await requireDebt(req.user.id, req.body.debtId);
    const account = await requireOwnedAccount(Account, req.user.id, req.body.accountId, { active: true });
    const paid = await debtTotals(DebtPayment, debt._id);
    const remaining = owedAmount(debt) - paid;
    const amount = Number(req.body.amount);
    if (amount > remaining) {
      throw new FinanceError('Payment cannot be greater than the remaining debt');
    }
    const categoryId = resolveCategoryId(debt, req.body.categoryId || null);
    const participantId = resolveParticipantId(debt, req.body.participantId || null);
    const payments = await DebtPayment.find({ debtId: debt._id, userId: debt.userId }).select(
      'amount categoryId participantId',
    );
    if (amount > categoryRemaining(debt, payments, categoryId)) {
      throw new FinanceError('Payment cannot be greater than the remaining balance');
    }
    if (participantId && amount > participantRemaining(debt, payments, participantId)) {
      throw new FinanceError('Payment cannot be greater than this payer\'s remaining share');
    }
    const subBalanceId = resolvePocketId(account, req.body.subBalanceId || null);
    assertRecordAsFlags(debt, req.body);
    await applyPaymentPocket(account, subBalanceId, debt, amount);
    const payment = await DebtPayment.create({
      userId: req.user.id,
      debtId: debt._id,
      accountId: req.body.accountId,
      categoryId,
      participantId,
      subBalanceId,
      amount,
      paymentDate: new Date(req.body.paymentDate),
      notes: req.body.notes || '',
    });
    try {
      if (isPayableDebt(debt)) {
        if (req.body.recordAsExpense === true) {
          const fields = requireExpenseFields(req.body);
          const expense = await createLinkedExpense(req.user.id, payment, fields);
          payment.transactionId = expense._id;
          await payment.save();
        }
      } else if (req.body.recordAsIncome === true) {
        const fields = requireIncomeFields(req.body);
        const income = await createLinkedIncome(req.user.id, payment, fields);
        payment.transactionId = income._id;
        await payment.save();
      }
    } catch (error) {
      await applyPaymentPocket(account, subBalanceId, debt, -amount);
      await payment.deleteOne();
      throw error;
    }
    const [presented] = await withLinkedTransactions(req.user.id, [payment]);
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
    const sameAccount = String(nextAccountId) === String(payment.accountId);
    const oldAccount = await requireOwnedAccount(Account, req.user.id, payment.accountId);
    const nextAccount = sameAccount
      ? oldAccount
      : await requireOwnedAccount(Account, req.user.id, nextAccountId, { active: true });
    const paid = await debtTotals(DebtPayment, debt._id);
    const oldAmount = Number(payment.amount);
    const nextAmount = req.body.amount !== undefined ? Number(req.body.amount) : oldAmount;
    const remainingWithoutThis = owedAmount(debt) - (paid - oldAmount);
    if (nextAmount > remainingWithoutThis) {
      throw new FinanceError('Payment cannot be greater than the remaining debt');
    }
    const requestedCategory =
      req.body.categoryId !== undefined ? req.body.categoryId || null : payment.categoryId;
    const nextCategoryId = resolveCategoryId(debt, requestedCategory);
    const requestedParticipant =
      req.body.participantId !== undefined ? req.body.participantId || null : payment.participantId;
    const nextParticipantId = resolveParticipantId(debt, requestedParticipant);
    const others = await DebtPayment.find({
      debtId: debt._id,
      userId: debt.userId,
      _id: { $ne: payment._id },
    }).select('amount categoryId participantId');
    if (nextAmount > categoryRemaining(debt, others, nextCategoryId)) {
      throw new FinanceError('Payment cannot be greater than the remaining balance');
    }
    if (nextParticipantId && nextAmount > participantRemaining(debt, others, nextParticipantId)) {
      throw new FinanceError('Payment cannot be greater than this payer\'s remaining share');
    }
    const requestedPocket =
      req.body.subBalanceId !== undefined
        ? req.body.subBalanceId || null
        : sameAccount
          ? payment.subBalanceId
          : null;
    const oldPocketId = resolvePocketId(oldAccount, payment.subBalanceId);
    const nextPocketId = resolvePocketId(nextAccount, requestedPocket);
    if (req.body.accountId !== undefined) payment.accountId = req.body.accountId;
    if (req.body.amount !== undefined) payment.amount = nextAmount;
    if (req.body.paymentDate !== undefined) payment.paymentDate = new Date(req.body.paymentDate);
    if (req.body.notes !== undefined) payment.notes = req.body.notes;
    payment.categoryId = nextCategoryId;
    payment.participantId = nextParticipantId;
    payment.subBalanceId = nextPocketId;
    assertRecordAsFlags(debt, req.body);
    if (
      req.body.recordAsIncome !== undefined ||
      req.body.recordAsExpense !== undefined ||
      req.body.incomeLabel !== undefined ||
      req.body.incomeCategoryId !== undefined ||
      req.body.expenseLabel !== undefined ||
      req.body.expenseCategoryId !== undefined
    ) {
      await syncPaymentLinkedTransaction(req.user.id, debt, payment, req.body);
    } else if (payment.transactionId) {
      if (isPayableDebt(debt)) {
        await syncLinkedExpense(req.user.id, payment);
      } else {
        await syncLinkedIncome(req.user.id, payment);
      }
    }
    await payment.save();
    applySubBalanceDelta(oldAccount, oldPocketId, -paymentCashDelta(debt, oldAmount));
    if (!sameAccount) await oldAccount.save();
    applySubBalanceDelta(nextAccount, nextPocketId, paymentCashDelta(debt, nextAmount));
    await nextAccount.save();
    const [presented] = await withLinkedTransactions(req.user.id, [payment]);
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
    const debt = await requireDebt(req.user.id, payment.debtId);
    const account = await requireOwnedAccount(Account, req.user.id, payment.accountId);
    const pocketId = resolvePocketId(account, payment.subBalanceId);
    applySubBalanceDelta(account, pocketId, -paymentCashDelta(debt, payment.amount));
    await account.save();
    await deleteLinkedTransaction(req.user.id, payment);
    await payment.deleteOne();
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
  addToBalance,
  updateAddition,
  deleteAddition,
  deleteDebt,
  getDebtPayments,
  createDebtPayment,
  updateDebtPayment,
  deleteDebtPayment,
};
