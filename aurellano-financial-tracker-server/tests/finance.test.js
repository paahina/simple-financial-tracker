const assert = require('node:assert/strict');
const { after, before, beforeEach, test } = require('node:test');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');

let mongod;
let app;
let mongoose;

before(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-that-is-long-enough';
  process.env.JWT_EXPIRES_IN = '1h';
  process.env.MONGODB_URI = mongod.getUri();

  mongoose = require('mongoose');
  app = require('../index');
  await mongoose.connect(process.env.MONGODB_URI);
});

beforeEach(async () => {
  const names = [
    'users',
    'accounts',
    'categories',
    'transactions',
    'transfers',
    'debts',
    'debtpayments',
    'tobuys',
  ];
  for (const name of names) {
    await mongoose.connection.collection(name).deleteMany({});
  }
});

after(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

const auth = (token) => ({ Authorization: `Bearer ${token}` });

async function register(email) {
  const response = await request(app).post('/api/users/register').send({
    name: 'Aurellano',
    email,
    password: 'password123',
  });
  assert.equal(response.status, 201);
  return response.body.token;
}

test('daily money flow updates balances, dashboard, and reports', async () => {
  const token = await register('finance@example.com');
  const today = new Date().toISOString();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const categories = await request(app)
    .get('/api/categories/getAllCategories')
    .set(auth(token));
  assert.equal(categories.status, 200);
  const salary = categories.body.find((item) => item.name === 'Salary' && item.type === 'INCOME');
  const food = categories.body.find((item) => item.name === 'Food' && item.type === 'EXPENSE');
  assert.ok(salary);
  assert.ok(food);

  const cash = await request(app).post('/api/accounts/create').set(auth(token)).send({
    name: 'Cash',
    type: 'CASH',
    initialBalance: 500000,
    currency: 'PHP',
  });
  const gcash = await request(app).post('/api/accounts/create').set(auth(token)).send({
    name: 'GCash',
    type: 'E_WALLET',
    initialBalance: 0,
  });
  assert.equal(cash.status, 201);
  assert.equal(gcash.status, 201);
  assert.equal(cash.body.account.subBalances.length, 1);
  assert.equal(cash.body.account.subBalances[0].label, 'Current');
  assert.equal(cash.body.account.subBalances[0].amount, 500000);

  const income = await request(app).post('/api/transactions/create').set(auth(token)).send({
    accountId: cash.body.account._id,
    type: 'INCOME',
    amount: 1000000,
    label: 'Salary',
    categoryId: salary._id,
    transactionDate: today,
  });
  assert.equal(income.status, 201);

  const expense = await request(app).post('/api/transactions/create').set(auth(token)).send({
    accountId: cash.body.account._id,
    type: 'EXPENSE',
    amount: 25000,
    label: 'Lunch',
    categoryId: food._id,
    transactionDate: today,
  });
  assert.equal(expense.status, 201);

  const wrongCategory = await request(app).post('/api/transactions/create').set(auth(token)).send({
    accountId: cash.body.account._id,
    type: 'INCOME',
    amount: 100,
    label: 'Bad',
    categoryId: food._id,
    transactionDate: today,
  });
  assert.equal(wrongCategory.status, 400);

  const transfer = await request(app).post('/api/transfers/create').set(auth(token)).send({
    fromAccountId: cash.body.account._id,
    toAccountId: gcash.body.account._id,
    amount: 200000,
    transactionDate: today,
  });
  assert.equal(transfer.status, 201);

  const sameAccount = await request(app).post('/api/transfers/create').set(auth(token)).send({
    fromAccountId: cash.body.account._id,
    toAccountId: cash.body.account._id,
    amount: 100,
    transactionDate: today,
  });
  assert.equal(sameAccount.status, 400);

  const debt = await request(app).post('/api/debts/create').set(auth(token)).send({
    personName: 'Juan',
    originalAmount: 500000,
    dueDate: yesterday,
  });
  assert.equal(debt.status, 201);
  assert.equal(debt.body.debt.status, 'OVERDUE');

  const added = await request(app).post('/api/debts/createAddition').set(auth(token)).send({
    debtId: debt.body.debt._id,
    label: 'Extra',
    amount: 10000,
    createdAt: today,
  });
  assert.equal(added.status, 201);
  assert.equal(added.body.originalAmount, 500000);
  assert.equal(added.body.additions.length, 1);
  assert.equal(added.body.additions[0].label, 'Extra');
  assert.equal(added.body.totalAmount, 510000);
  assert.equal(added.body.remainingAmount, 510000);

  const payment = await request(app).post('/api/debts/createPayment').set(auth(token)).send({
    debtId: debt.body.debt._id,
    accountId: gcash.body.account._id,
    amount: 200000,
    paymentDate: today,
  });
  assert.equal(payment.status, 201);
  assert.equal(payment.body.debt.remainingAmount, 310000);

  const tooMuch = await request(app).post('/api/debts/createPayment').set(auth(token)).send({
    debtId: debt.body.debt._id,
    accountId: gcash.body.account._id,
    amount: 310001,
    paymentDate: today,
  });
  assert.equal(tooMuch.status, 400);

  const accounts = await request(app).get('/api/accounts/getAllAccounts').set(auth(token));
  const cashBalance = accounts.body.find((item) => item.name === 'Cash').balance;
  const gcashBalance = accounts.body.find((item) => item.name === 'GCash').balance;
  assert.equal(cashBalance, 1275000);
  assert.equal(gcashBalance, 400000);

  const dashboard = await request(app).get('/api/dashboard/get').set(auth(token));
  assert.equal(dashboard.status, 200);
  assert.equal(dashboard.body.totalMoney, 1675000);
  assert.equal(dashboard.body.monthlyIncome, 1000000);
  assert.equal(dashboard.body.monthlyExpenses, 25000);
  assert.equal(dashboard.body.monthlyNet, 975000);
  assert.equal(dashboard.body.outstandingReceivables, 310000);

  const openDebt = await request(app).post('/api/debts/create').set(auth(token)).send({
    personName: 'No date',
    originalAmount: 1000,
  });
  assert.equal(openDebt.status, 201);
  assert.equal(openDebt.body.debt.dueDate, null);
  assert.equal(openDebt.body.debt.status, 'PENDING');

  const now = new Date();
  const report = await request(app)
    .get(`/api/reports/monthly?year=${now.getUTCFullYear()}&month=${now.getUTCMonth() + 1}`)
    .set(auth(token));
  assert.equal(report.status, 200);
  assert.equal(report.body.income, 1000000);
  assert.equal(report.body.expenses, 25000);
  assert.equal(report.body.net, 975000);
  assert.equal(report.body.dailyExpenses.total, 1);
  assert.equal(report.body.dailyExpenses.data[0].label, 'Lunch');
  assert.equal(report.body.dailyExpenses.data[0].categoryName, 'Food');
  assert.equal(report.body.dailyExpenses.data[0].amount, 25000);

  const transactionDays = await request(app)
    .get('/api/transactions/days?timezone=UTC&page=1&limit=10')
    .set(auth(token));
  assert.equal(transactionDays.status, 200);
  assert.equal(transactionDays.body.total, 1);
  assert.equal(transactionDays.body.data[0].count, 2);
  assert.equal(transactionDays.body.data[0].addedAmount, 1000000);
  assert.equal(transactionDays.body.data[0].deductedAmount, 25000);

  const transferDays = await request(app)
    .get('/api/transfers/days?timezone=UTC&page=1&limit=10')
    .set(auth(token));
  assert.equal(transferDays.status, 200);
  assert.equal(transferDays.body.data[0].count, 1);
  assert.equal(transferDays.body.data[0].addedAmount, 200000);
  assert.equal(transferDays.body.data[0].deductedAmount, 200000);

  const badZone = await request(app)
    .get('/api/transactions/days?timezone=Not/AZone')
    .set(auth(token));
  assert.equal(badZone.status, 400);

  const limited = await request(app).post('/api/accounts/create').set(auth(token)).send({
    name: 'Limited',
    type: 'CASH',
    initialBalance: 10000,
    remainingBalance: 50000,
  });
  assert.equal(limited.status, 201);
  assert.equal(limited.body.account.remainingBalance, 50000);
  assert.equal(limited.body.account.balance < limited.body.account.remainingBalance, true);

  const heldBack = await request(app).get('/api/dashboard/get').set(auth(token));
  assert.equal(heldBack.body.totalMoney, 1685000);

  const reserved = await request(app)
    .put(`/api/accounts/update/${limited.body.account._id}`)
    .set(auth(token))
    .send({ remainingBalance: 2000 });
  assert.equal(reserved.status, 200);
  const afterReserve = await request(app).get('/api/dashboard/get').set(auth(token));
  assert.equal(afterReserve.body.totalMoney, 1685000);

  const cleared = await request(app)
    .put(`/api/accounts/update/${limited.body.account._id}`)
    .set(auth(token))
    .send({ remainingBalance: null });
  assert.equal(cleared.status, 200);
  assert.equal(cleared.body.remainingBalance, null);

  const negativeRemaining = await request(app).post('/api/accounts/create').set(auth(token)).send({
    name: 'Negative remaining',
    type: 'CASH',
    remainingBalance: -1,
  });
  assert.equal(negativeRemaining.status, 400);

  const spare = await request(app).post('/api/accounts/create').set(auth(token)).send({
    name: 'Spare',
    type: 'CASH',
    initialBalance: 0,
  });
  assert.equal(spare.status, 201);
  const sameName = await request(app).post('/api/accounts/create').set(auth(token)).send({
    name: 'Spare',
    type: 'E_WALLET',
    initialBalance: 0,
  });
  assert.equal(sameName.status, 201);

  const deactivated = await request(app)
    .delete(`/api/accounts/delete/${spare.body.account._id}`)
    .set(auth(token));
  assert.equal(deactivated.status, 200);
  assert.equal(deactivated.body.account.isActive, false);

  const reactivated = await request(app)
    .put(`/api/accounts/reactivate/${spare.body.account._id}`)
    .set(auth(token));
  assert.equal(reactivated.status, 200);
  assert.equal(reactivated.body.account.isActive, true);

  const adjustable = await request(app).post('/api/accounts/create').set(auth(token)).send({
    name: 'Adjustable',
    type: 'CASH',
    initialBalance: 0,
  });
  assert.equal(adjustable.status, 201);
  const received = await request(app).post('/api/transactions/create').set(auth(token)).send({
    accountId: adjustable.body.account._id,
    type: 'INCOME',
    amount: 50000,
    label: 'Received',
    categoryId: salary._id,
    transactionDate: today,
  });
  assert.equal(received.status, 201);
  const negativeAmount = await request(app)
    .put(`/api/accounts/update/${adjustable.body.account._id}`)
    .set(auth(token))
    .send({ currentBalance: -1 });
  assert.equal(negativeAmount.status, 400);
  const lowered = await request(app)
    .put(`/api/accounts/update/${adjustable.body.account._id}`)
    .set(auth(token))
    .send({ currentBalance: 1000 });
  assert.equal(lowered.status, 200);
  assert.equal(lowered.body.balance, 1000);
  const blockedDelete = await request(app)
    .delete(`/api/accounts/remove/${adjustable.body.account._id}`)
    .set(auth(token));
  assert.equal(blockedDelete.status, 400);

  const alreadyActive = await request(app)
    .put(`/api/accounts/reactivate/${spare.body.account._id}`)
    .set(auth(token));
  assert.equal(alreadyActive.status, 200);
  assert.equal(alreadyActive.body.account.isActive, true);

  const other = await register('other@example.com');
  const hidden = await request(app)
    .get(`/api/accounts/get/${cash.body.account._id}`)
    .set(auth(other));
  assert.equal(hidden.status, 404);
});

test('debt payment can also create a linked income transaction without doubling balance', async () => {
  const token = await register('income-payment@example.com');
  const today = new Date().toISOString();
  const categories = await request(app).get('/api/categories/getAllCategories').set(auth(token));
  const otherIncome = categories.body.find((item) => item.name === 'Other' && item.type === 'INCOME');
  const cash = await request(app).post('/api/accounts/create').set(auth(token)).send({
    name: 'Cash',
    type: 'CASH',
    initialBalance: 0,
  });
  const debt = await request(app).post('/api/debts/create').set(auth(token)).send({
    personName: 'Ana',
    originalAmount: 10000,
  });
  const linked = await request(app).post('/api/debts/createPayment').set(auth(token)).send({
    debtId: debt.body.debt._id,
    accountId: cash.body.account._id,
    amount: 4000,
    paymentDate: today,
    recordAsIncome: true,
    incomeLabel: 'Ana paid',
    incomeCategoryId: otherIncome._id,
  });
  assert.equal(linked.status, 201);
  assert.ok(linked.body.payment.transactionId);
  assert.equal(linked.body.debt.remainingAmount, 6000);

  const accounts = await request(app).get('/api/accounts/getAllAccounts').set(auth(token));
  assert.equal(accounts.body[0].balance, 4000);
  assert.equal(accounts.body[0].subBalances[0].amount, 4000);
  assert.ok(linked.body.payment.subBalanceId);

  const now = new Date();
  const report = await request(app)
    .get(`/api/reports/monthly?year=${now.getUTCFullYear()}&month=${now.getUTCMonth() + 1}`)
    .set(auth(token));
  assert.equal(report.body.income, 4000);

  const removed = await request(app)
    .delete(`/api/debts/deletePayment/${linked.body.payment._id}`)
    .set(auth(token));
  assert.equal(removed.status, 200);
  const after = await request(app).get('/api/accounts/getAllAccounts').set(auth(token));
  assert.equal(after.body[0].balance, 0);
  const txs = await request(app).get('/api/transactions/getAllTransactions?page=1&limit=10').set(auth(token));
  assert.equal(txs.body.total, 0);
});

test('account sub-balances move with transactions and same-account transfers', async () => {
  const token = await register('pockets@example.com');
  const today = new Date().toISOString();
  const categories = await request(app).get('/api/categories/getAllCategories').set(auth(token));
  const food = categories.body.find((item) => item.name === 'Food' && item.type === 'EXPENSE');
  const created = await request(app).post('/api/accounts/create').set(auth(token)).send({
    name: 'BPI',
    type: 'BANK',
    initialBalance: 350000,
    subBalances: [
      { label: 'Savings', amount: 20000 },
      { label: 'Spend', amount: 330000 },
    ],
  });
  assert.equal(created.status, 201);
  const savings = created.body.account.subBalances.find((item) => item.label === 'Savings');
  const spend = created.body.account.subBalances.find((item) => item.label === 'Spend');
  const missingPocket = await request(app).post('/api/transactions/create').set(auth(token)).send({
    accountId: created.body.account._id,
    type: 'EXPENSE',
    amount: 1000,
    label: 'Snack',
    categoryId: food._id,
    transactionDate: today,
  });
  assert.equal(missingPocket.status, 400);

  const expense = await request(app).post('/api/transactions/create').set(auth(token)).send({
    accountId: created.body.account._id,
    type: 'EXPENSE',
    amount: 5000,
    label: 'Snack',
    categoryId: food._id,
    subBalanceId: spend._id,
    transactionDate: today,
  });
  assert.equal(expense.status, 201);

  const tooMuch = await request(app).post('/api/transfers/create').set(auth(token)).send({
    fromAccountId: created.body.account._id,
    toAccountId: created.body.account._id,
    fromSubBalanceId: savings._id,
    toSubBalanceId: spend._id,
    amount: 20001,
    transactionDate: today,
  });
  assert.equal(tooMuch.status, 400);

  const moved = await request(app).post('/api/transfers/create').set(auth(token)).send({
    fromAccountId: created.body.account._id,
    toAccountId: created.body.account._id,
    fromSubBalanceId: savings._id,
    toSubBalanceId: spend._id,
    amount: 10000,
    transactionDate: today,
  });
  assert.equal(moved.status, 201);

  const account = await request(app).get(`/api/accounts/get/${created.body.account._id}`).set(auth(token));
  assert.equal(account.body.balance, 345000);
  const nextSavings = account.body.subBalances.find((item) => item.label === 'Savings');
  const nextSpend = account.body.subBalances.find((item) => item.label === 'Spend');
  assert.equal(nextSavings.amount, 10000);
  assert.equal(nextSpend.amount, 335000);
});

test('debt payment credits the chosen pocket once even with linked income', async () => {
  const token = await register('payment-pocket@example.com');
  const today = new Date().toISOString();
  const categories = await request(app).get('/api/categories/getAllCategories').set(auth(token));
  const otherIncome = categories.body.find((item) => item.name === 'Other' && item.type === 'INCOME');
  const cash = await request(app).post('/api/accounts/create').set(auth(token)).send({
    name: 'Cash',
    type: 'CASH',
    initialBalance: 10000,
    subBalances: [
      { label: 'Current', amount: 4000 },
      { label: 'Spend', amount: 6000 },
    ],
  });
  const current = cash.body.account.subBalances.find((item) => item.label === 'Current');
  const spend = cash.body.account.subBalances.find((item) => item.label === 'Spend');
  const debt = await request(app).post('/api/debts/create').set(auth(token)).send({
    personName: 'Ben',
    originalAmount: 10000,
  });
  const missingPocket = await request(app).post('/api/debts/createPayment').set(auth(token)).send({
    debtId: debt.body.debt._id,
    accountId: cash.body.account._id,
    amount: 2000,
    paymentDate: today,
  });
  assert.equal(missingPocket.status, 400);

  const linked = await request(app).post('/api/debts/createPayment').set(auth(token)).send({
    debtId: debt.body.debt._id,
    accountId: cash.body.account._id,
    subBalanceId: spend._id,
    amount: 2000,
    paymentDate: today,
    recordAsIncome: true,
    incomeLabel: 'Ben paid',
    incomeCategoryId: otherIncome._id,
  });
  assert.equal(linked.status, 201);
  assert.equal(String(linked.body.payment.subBalanceId), String(spend._id));

  const afterCreate = await request(app).get(`/api/accounts/get/${cash.body.account._id}`).set(auth(token));
  assert.equal(afterCreate.body.balance, 12000);
  assert.equal(afterCreate.body.subBalances.find((item) => item.label === 'Current').amount, 4000);
  assert.equal(afterCreate.body.subBalances.find((item) => item.label === 'Spend').amount, 8000);

  const moved = await request(app)
    .put(`/api/debts/updatePayment/${linked.body.payment._id}`)
    .set(auth(token))
    .send({ subBalanceId: current._id, amount: 3000 });
  assert.equal(moved.status, 200);

  const afterUpdate = await request(app).get(`/api/accounts/get/${cash.body.account._id}`).set(auth(token));
  assert.equal(afterUpdate.body.balance, 13000);
  assert.equal(afterUpdate.body.subBalances.find((item) => item.label === 'Current').amount, 7000);
  assert.equal(afterUpdate.body.subBalances.find((item) => item.label === 'Spend').amount, 6000);

  const removed = await request(app)
    .delete(`/api/debts/deletePayment/${linked.body.payment._id}`)
    .set(auth(token));
  assert.equal(removed.status, 200);
  const afterDelete = await request(app).get(`/api/accounts/get/${cash.body.account._id}`).set(auth(token));
  assert.equal(afterDelete.body.balance, 10000);
  assert.equal(afterDelete.body.subBalances.find((item) => item.label === 'Current').amount, 4000);
  assert.equal(afterDelete.body.subBalances.find((item) => item.label === 'Spend').amount, 6000);
});

test('contribution payers split the total and payments stay on one payer', async () => {
  const token = await register('contribution@example.com');
  const today = new Date().toISOString();
  const cash = await request(app).post('/api/accounts/create').set(auth(token)).send({
    name: 'Cash',
    type: 'CASH',
    initialBalance: 0,
  });
  const created = await request(app).post('/api/debts/create').set(auth(token)).send({
    personName: 'Friday dinner',
    kind: 'CONTRIBUTION',
    originalAmount: 3000,
    participants: [
      { name: 'Juan', amount: 1000 },
      { name: 'Maria', amount: 1000 },
      { name: 'Pedro', amount: 1000 },
    ],
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.debt.kind, 'CONTRIBUTION');
  assert.equal(created.body.debt.totalAmount, 3000);
  const maria = created.body.debt.participants.find((item) => item.name === 'Maria');

  const missingPayer = await request(app).post('/api/debts/createPayment').set(auth(token)).send({
    debtId: created.body.debt._id,
    accountId: cash.body.account._id,
    amount: 500,
    paymentDate: today,
  });
  assert.equal(missingPayer.status, 400);

  const paidMaria = await request(app).post('/api/debts/createPayment').set(auth(token)).send({
    debtId: created.body.debt._id,
    accountId: cash.body.account._id,
    participantId: maria.id,
    amount: 500,
    paymentDate: today,
  });
  assert.equal(paidMaria.status, 201);
  const afterMaria = paidMaria.body.debt.participants.find((item) => item.name === 'Maria');
  const afterJuan = paidMaria.body.debt.participants.find((item) => item.name === 'Juan');
  assert.equal(afterMaria.paidAmount, 500);
  assert.equal(afterMaria.remainingAmount, 500);
  assert.equal(afterJuan.paidAmount, 0);
  assert.equal(paidMaria.body.debt.remainingAmount, 2500);

  const tooMuch = await request(app).post('/api/debts/createPayment').set(auth(token)).send({
    debtId: created.body.debt._id,
    accountId: cash.body.account._id,
    participantId: maria.id,
    amount: 501,
    paymentDate: today,
  });
  assert.equal(tooMuch.status, 400);

  const uneven = await request(app).post('/api/debts/create').set(auth(token)).send({
    personName: 'Uneven',
    kind: 'CONTRIBUTION',
    originalAmount: 100,
    participants: [
      { name: 'A', amount: 34 },
      { name: 'B', amount: 33 },
      { name: 'C', amount: 33 },
    ],
  });
  assert.equal(uneven.status, 201);
  assert.equal(uneven.body.debt.participants[0].amount, 34);

  const badSum = await request(app).post('/api/debts/create').set(auth(token)).send({
    personName: 'Bad sum',
    kind: 'CONTRIBUTION',
    originalAmount: 100,
    participants: [
      { name: 'A', amount: 40 },
      { name: 'B', amount: 40 },
    ],
  });
  assert.equal(badSum.status, 400);
});

test('individual debt balances split the total and a payment hits one slice', async () => {
  const token = await register('debt-balances@example.com');
  const today = new Date().toISOString();
  const cash = await request(app).post('/api/accounts/create').set(auth(token)).send({
    name: 'Cash',
    type: 'CASH',
    initialBalance: 0,
  });
  const created = await request(app).post('/api/debts/create').set(auth(token)).send({
    personName: 'Ana',
    kind: 'INDIVIDUAL',
    subBalances: [
      { label: 'Current', amount: 4000 },
      { label: 'Rent', amount: 6000 },
    ],
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.debt.totalAmount, 10000);
  assert.equal(created.body.debt.originalAmount, 0);
  const rent = created.body.debt.categories.find((item) => item.label === 'Rent');
  const current = created.body.debt.categories.find((item) => item.label === 'Current');

  const missingSlice = await request(app).post('/api/debts/createPayment').set(auth(token)).send({
    debtId: created.body.debt._id,
    accountId: cash.body.account._id,
    amount: 1000,
    paymentDate: today,
  });
  assert.equal(missingSlice.status, 400);

  const paidRent = await request(app).post('/api/debts/createPayment').set(auth(token)).send({
    debtId: created.body.debt._id,
    accountId: cash.body.account._id,
    categoryId: rent.id,
    amount: 1500,
    paymentDate: today,
  });
  assert.equal(paidRent.status, 201);
  const afterRent = paidRent.body.debt.categories.find((item) => item.label === 'Rent');
  const afterCurrent = paidRent.body.debt.categories.find((item) => item.label === 'Current');
  assert.equal(afterRent.remainingAmount, 4500);
  assert.equal(afterCurrent.paidAmount, 0);
  assert.equal(paidRent.body.debt.remainingAmount, 8500);
  assert.ok(current.id);
});

test('to-buy complete records an expense and delete does not', async () => {
  const token = await register('tobuy@example.com');
  const cash = await request(app).post('/api/accounts/create').set(auth(token)).send({
    name: 'Cash',
    type: 'CASH',
    initialBalance: 50000,
  });
  assert.equal(cash.status, 201);
  const pocket = cash.body.account.subBalances[0]._id;

  const created = await request(app).post('/api/to-buy/create').set(auth(token)).send({
    name: 'Rice',
    quantity: 2,
    unitPrice: 15000,
    notes: '5kg sack',
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.item.estimatedAmount, 30000);

  const listed = await request(app).get('/api/to-buy/getAll?page=1&limit=10').set(auth(token));
  assert.equal(listed.status, 200);
  assert.equal(listed.body.total, 1);
  assert.equal(listed.body.estimatedTotal, 30000);

  const extra = await request(app).post('/api/to-buy/create').set(auth(token)).send({
    name: 'Soap',
    quantity: 1,
    unitPrice: 5000,
  });
  assert.equal(extra.status, 201);
  const deleted = await request(app)
    .delete(`/api/to-buy/delete/${extra.body.item._id}`)
    .set(auth(token));
  assert.equal(deleted.status, 200);
  const afterDelete = await request(app)
    .get(`/api/accounts/get/${cash.body.account._id}`)
    .set(auth(token));
  assert.equal(afterDelete.body.subBalances[0].amount, 50000);

  const done = await request(app)
    .post(`/api/to-buy/complete/${created.body.item._id}`)
    .set(auth(token))
    .send({ accountId: cash.body.account._id, amount: 28000, subBalanceId: pocket });
  assert.equal(done.status, 201);
  assert.equal(done.body.transaction.type, 'EXPENSE');
  assert.equal(done.body.transaction.label, 'Rice');
  assert.equal(done.body.transaction.amount, 28000);
  assert.equal(done.body.transaction.description, '5kg sack');

  const categories = await request(app).get('/api/categories/getAllCategories').set(auth(token));
  const shopping = categories.body.find((item) => item.name === 'Shopping' && item.type === 'EXPENSE');
  assert.equal(String(done.body.transaction.categoryId), String(shopping._id));

  const remaining = await request(app).get('/api/to-buy/getAll?page=1&limit=10').set(auth(token));
  assert.equal(remaining.body.total, 0);

  const account = await request(app)
    .get(`/api/accounts/get/${cash.body.account._id}`)
    .set(auth(token));
  assert.equal(account.body.subBalances[0].amount, 22000);
});
