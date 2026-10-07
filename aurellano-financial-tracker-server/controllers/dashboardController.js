const Account = require('../models/accountModel');
const Transaction = require('../models/transactionModel');
const Transfer = require('../models/transferModel');
const Debt = require('../models/debtModel');
const DebtPayment = require('../models/debtPaymentModel');
const { HttpStatus } = require('../config/constants');
const { balanceForAccount, debtState, debtTotals, monthRange, sumAmount, sendFinanceError } =
  require('../utils/finance');

const getDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const { start, end } = monthRange(now.getUTCFullYear(), now.getUTCMonth() + 1);
    const accounts = await Account.find({ userId, isActive: true }).sort({ name: 1 });
    const accountBalances = await Promise.all(
      accounts.map(async (account) => ({
        id: account._id,
        name: account.name,
        type: account.type,
        currency: account.currency,
        balance: await balanceForAccount(account, { Transaction, Transfer, DebtPayment }),
      })),
    );
    const totalMoney = accountBalances.reduce((sum, account) => sum + account.balance, 0);
    const [monthlyIncome, monthlyExpenses, debts, recentTransactions] = await Promise.all([
      sumAmount(Transaction, {
        userId,
        type: 'INCOME',
        transactionDate: { $gte: start, $lt: end },
      }),
      sumAmount(Transaction, {
        userId,
        type: 'EXPENSE',
        transactionDate: { $gte: start, $lt: end },
      }),
      Debt.find({ userId }),
      Transaction.find({ userId }).sort({ transactionDate: -1, createdAt: -1 }).limit(10),
    ]);

    let outstandingReceivables = 0;
    for (const debt of debts) {
      const paid = await debtTotals(DebtPayment, debt._id);
      const state = debtState(debt.originalAmount, paid, debt.dueDate, now);
      outstandingReceivables += state.remaining;
    }

    res.status(HttpStatus.OK).json({
      totalMoney,
      monthlyIncome,
      monthlyExpenses,
      monthlyNet: monthlyIncome - monthlyExpenses,
      outstandingReceivables,
      accountBalances,
      recentTransactions,
    });
  } catch (error) {
    sendFinanceError(res, error);
  }
};

module.exports = { getDashboard };
