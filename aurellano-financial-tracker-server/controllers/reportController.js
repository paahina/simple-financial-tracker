const Transaction = require('../models/transactionModel');
const Category = require('../models/categoryModel');
const { HttpStatus } = require('../config/constants');
const { FinanceError, categoryTotals, monthRange, sumAmount, toId, sendFinanceError } =
  require('../utils/finance');

const periodTotals = async (userId, start, end) => {
  const matchBase = {
    userId: toId(userId),
    transactionDate: { $gte: start, $lt: end },
  };
  const [income, expenses, incomeByCategory, expensesByCategory] = await Promise.all([
    sumAmount(Transaction, { ...matchBase, type: 'INCOME' }),
    sumAmount(Transaction, { ...matchBase, type: 'EXPENSE' }),
    categoryTotals(Transaction, Category, { ...matchBase, type: 'INCOME' }),
    categoryTotals(Transaction, Category, { ...matchBase, type: 'EXPENSE' }),
  ]);
  return {
    income,
    expenses,
    net: income - expenses,
    incomeByCategory,
    expensesByCategory,
  };
};

const readYearMonth = (query) => {
  const now = new Date();
  const year = Number(query.year || now.getUTCFullYear());
  const month = Number(query.month || now.getUTCMonth() + 1);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new FinanceError('Year must be between 2000 and 2100');
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new FinanceError('Month must be between 1 and 12');
  }
  return { year, month };
};

const getMonthlyReport = async (req, res) => {
  try {
    const { year, month } = readYearMonth(req.query);
    const { start, end } = monthRange(year, month);
    const report = await periodTotals(req.user.id, start, end);
    res.status(HttpStatus.OK).json({ year, month, ...report });
  } catch (error) {
    sendFinanceError(res, error);
  }
};

const getYearlyReport = async (req, res) => {
  try {
    const { year } = readYearMonth({ year: req.query.year, month: 1 });
    const monthlyBreakdown = [];
    for (let month = 1; month <= 12; month += 1) {
      const { start, end } = monthRange(year, month);
      const totals = await periodTotals(req.user.id, start, end);
      monthlyBreakdown.push({
        month,
        income: totals.income,
        expenses: totals.expenses,
        net: totals.net,
      });
    }
    const income = monthlyBreakdown.reduce((sum, month) => sum + month.income, 0);
    const expenses = monthlyBreakdown.reduce((sum, month) => sum + month.expenses, 0);
    res.status(HttpStatus.OK).json({
      year,
      income,
      expenses,
      net: income - expenses,
      monthlyBreakdown,
    });
  } catch (error) {
    sendFinanceError(res, error);
  }
};

module.exports = { getMonthlyReport, getYearlyReport };
