const assert = require('node:assert/strict');
const { after, before, beforeEach, test } = require('node:test');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');

const userInput = {
  name: 'Aurellano',
  email: 'aurellano@example.com',
  password: 'password123',
};

let mongod;
let app;
let mongoose;
let User;

before(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-that-is-long-enough';
  process.env.JWT_EXPIRES_IN = '1h';
  process.env.MONGODB_URI = mongod.getUri();

  mongoose = require('mongoose');
  app = require('../index');
  User = require('../models/userModel');
  await mongoose.connect(process.env.MONGODB_URI);
});

beforeEach(async () => {
  await mongoose.connection.collection('users').deleteMany({});
});

after(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

test('register creates a user and does not return the password', async () => {
  const response = await request(app).post('/api/users/register').send(userInput);

  assert.equal(response.status, 201);
  assert.equal(response.body.message, 'Account created');
  assert.equal(response.body.user.email, userInput.email);
  assert.equal(response.body.user.role, 'USER');
  assert.equal(response.body.user.password, undefined);
  assert.ok(response.body.token);
});

test('register rejects duplicate emails, short passwords, and a client role', async () => {
  await request(app).post('/api/users/register').send(userInput);

  const duplicate = await request(app).post('/api/users/register').send(userInput);
  assert.equal(duplicate.status, 400);

  const invalid = await request(app)
    .post('/api/users/register')
    .send({ ...userInput, email: 'other@example.com', password: 'short' });
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.message, 'Validation failed');

  const withRole = await request(app)
    .post('/api/users/register')
    .send({
      ...userInput,
      email: 'admin-attempt@example.com',
      role: 'SYSTEM_ADMIN',
    });
  assert.equal(withRole.status, 201);
  assert.equal(withRole.body.user.role, 'USER');
});

test('login returns a bearer token and session requires it', async () => {
  await request(app).post('/api/users/register').send(userInput);

  const unauthenticated = await request(app).get('/api/users/session');
  assert.equal(unauthenticated.status, 401);
  assert.equal(unauthenticated.body.message, 'No token provided');

  const loginResponse = await request(app).post('/api/users/login').send({
    email: userInput.email,
    password: userInput.password,
  });
  assert.equal(loginResponse.status, 200);
  assert.equal(loginResponse.body.message, 'Login successful');

  const session = await request(app)
    .get('/api/users/session')
    .set(authHeader(loginResponse.body.token));
  assert.equal(session.status, 200);
  assert.equal(session.body.user.email, userInput.email);

  const wrongPassword = await request(app).post('/api/users/login').send({
    email: userInput.email,
    password: 'wrong-password',
  });
  assert.equal(wrongPassword.status, 401);
  assert.equal(wrongPassword.body.message, 'Invalid email or password');
});

test('logout blacklists the token', async () => {
  const registered = await request(app).post('/api/users/register').send(userInput);
  const token = registered.body.token;

  const logoutResponse = await request(app)
    .post('/api/users/logout')
    .set(authHeader(token));
  assert.equal(logoutResponse.status, 200);
  assert.equal(logoutResponse.body.message, 'Logout successful');

  const session = await request(app)
    .get('/api/users/session')
    .set(authHeader(token));
  assert.equal(session.status, 401);
});

test('a user can read and update their own record, and cannot list or delete users', async () => {
  const registered = await request(app).post('/api/users/register').send(userInput);
  const token = registered.body.token;
  const userId = registered.body.user._id;

  const ownRecord = await request(app)
    .get(`/api/users/get/${userId}`)
    .set(authHeader(token));
  assert.equal(ownRecord.status, 200);
  assert.equal(ownRecord.body.email, userInput.email);

  const updated = await request(app)
    .put(`/api/users/update/${userId}`)
    .set(authHeader(token))
    .send({ name: 'Aurellano Cruz' });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.name, 'Aurellano Cruz');

  const list = await request(app)
    .get('/api/users/getAllUsers')
    .set(authHeader(token));
  assert.equal(list.status, 403);

  const remove = await request(app)
    .delete(`/api/users/delete/${userId}`)
    .set(authHeader(token));
  assert.equal(remove.status, 403);

  const saved = await User.findById(userId);
  assert.ok(saved);
});
