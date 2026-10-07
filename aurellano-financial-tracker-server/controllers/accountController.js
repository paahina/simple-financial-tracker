const Account = require('../models/accountModel');
const Transaction = require('../models/transactionModel');
const Transfer = require('../models/transferModel');
const DebtPayment = require('../models/debtPaymentModel');
const { HttpStatus } = require('../config/constants');
const {
  balanceForAccount,
  requireOwnedAccount,
  sendFinanceError,
} = require('../utils/finance');

const models = { Transaction, Transfer, DebtPayment };

const withBalance = async (account) => {
  const plain = account.toObject();
  plain.balance = await balanceForAccount(account, models);
  return plain;
};

const getAllAccounts = async (req, res) => {
  try {
    const accounts = await Account.find({ userId: req.user.id }).sort({ name: 1 });
    const withBalances = await Promise.all(accounts.map(withBalance));
    res.status(HttpStatus.OK).json(withBalances);
  } catch (error) {
    sendFinanceError(res, error);
  }
};

const getAccountById = async (req, res) => {
  try {
    const account = await requireOwnedAccount(Account, req.user.id, req.params.id);
    res.status(HttpStatus.OK).json(await withBalance(account));
  } catch (error) {
    sendFinanceError(res, error);
  }
};

const createAccount = async (req, res) => {
  try {
    const account = await Account.create({
      userId: req.user.id,
      name: req.body.name,
      type: req.body.type,
      initialBalance: Number(req.body.initialBalance || 0),
      currency: req.body.currency || 'PHP',
      description: req.body.description || '',
      isActive: true,
    });
    res.status(HttpStatus.CREATED).json({
      message: 'Account created',
      account: await withBalance(account),
    });
  } catch (error) {
    sendFinanceError(res, error);
  }
};

const updateAccount = async (req, res) => {
  try {
    if (req.body.initialBalance !== undefined) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'Initial balance cannot be changed',
      });
    }
    const account = await requireOwnedAccount(Account, req.user.id, req.params.id);
    const { name, type, currency, description } = req.body;
    if (name !== undefined) account.name = name;
    if (type !== undefined) account.type = type;
    if (currency !== undefined) account.currency = currency;
    if (description !== undefined) account.description = description;
    await account.save();
    res.status(HttpStatus.OK).json(await withBalance(account));
  } catch (error) {
    sendFinanceError(res, error);
  }
};

const deactivateAccount = async (req, res) => {
  try {
    const account = await requireOwnedAccount(Account, req.user.id, req.params.id);
    account.isActive = false;
    await account.save();
    res.status(HttpStatus.OK).json({
      message: 'Account deactivated',
      account: await withBalance(account),
    });
  } catch (error) {
    sendFinanceError(res, error);
  }
};

const getAccountActivity = async (req, res) => {
  try {
    const account = await requireOwnedAccount(Account, req.user.id, req.params.id);
    const accountId = account._id;
    const userId = req.user.id;
    const [transactions, transfersOut, transfersIn, debtPayments] = await Promise.all([
      Transaction.find({ userId, accountId }).sort({ transactionDate: -1 }),
      Transfer.find({ userId, fromAccountId: accountId }).sort({ transactionDate: -1 }),
      Transfer.find({ userId, toAccountId: accountId }).sort({ transactionDate: -1 }),
      DebtPayment.find({ userId, accountId }).sort({ paymentDate: -1 }),
    ]);
    res.status(HttpStatus.OK).json({
      account: await withBalance(account),
      transactions,
      transfersOut,
      transfersIn,
      debtPayments,
    });
  } catch (error) {
    sendFinanceError(res, error);
  }
};

module.exports = {
  getAllAccounts,
  getAccountById,
  createAccount,
  updateAccount,
  deactivateAccount,
  getAccountActivity,
};
