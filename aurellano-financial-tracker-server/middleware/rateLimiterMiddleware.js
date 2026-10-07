const rateLimit = require('express-rate-limit');

const skipInTest = () => process.env.NODE_ENV === 'test';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  message: {
    message: 'Too many login attempts. Please try again after 15 minutes.',
  },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  message: {
    message: 'Too many registration attempts. Please try again after 1 hour.',
  },
});

module.exports = { loginLimiter, registerLimiter };
