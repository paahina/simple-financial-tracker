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
  const names = ['users', 'accounts', 'categories', 'transactions', 'transfers', 'debts', 'debtpayments'];
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
