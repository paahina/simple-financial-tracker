const Account = require('../models/accountModel');
const Transaction = require('../models/transactionModel');
const Transfer = require('../models/transferModel');
const Debt = require('../models/debtModel');
const DebtPayment = require('../models/debtPaymentModel');
const { HttpStatus } = require('../config/constants');
const {
  balanceForAccount,
  debtState,
  debtTotals,
  monthRange,
  owedAmount,
  sumAmount,
  sendFinanceError,
} = require('../utils/finance');
const { slicePage } = require('../utils/pagination');

const getDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const { start, end } = monthRange(now.getUTCFullYear(), now.getUTCMonth() + 1);
    const accounts = await Account.find({ userId, isActive: true }).sort({ name: 1 });
    const accountBalances = await Promise.all(
      accounts.map(async (account) => {
        const balance = await balanceForAccount(account, { Transaction, Transfer, DebtPayment, Debt });
        return {
          id: account._id,
          name: account.name,
          type: account.type,
          currency: account.currency,
          balance,
        };
      }),
    );
    const totalMoney = accountBalances.reduce((sum, account) => sum + account.balance, 0);
    const accountPage = slicePage(accountBalances, req.query, 'accountPage', 'accountLimit');
    const [monthlyIncome, monthlyExpenses, debts] = await Promise.all([
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
    ]);

    let outstandingReceivables = 0;
    for (const debt of debts) {
      if (debt.direction === 'PAYABLE') continue;
      const paid = await debtTotals(DebtPayment, debt._id);
      const state = debtState(owedAmount(debt), paid, debt.dueDate, now);
      outstandingReceivables += state.remaining;
    }

    res.status(HttpStatus.OK).json({
      totalBalance: totalMoney,
      totalMoney,
      monthlyIncome,
      monthlyExpenses,
      monthlyNet: monthlyIncome - monthlyExpenses,
      outstandingReceivables,
      accountBalances: accountPage,
    });
  } catch (error) {
    sendFinanceError(res, error);
  }
};

module.exports = { getDashboard };
