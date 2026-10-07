require('dotenv').config();

const MONGO_DB_URL = process.env.MONGODB_URI || process.env.MONGO_URI;
const SALT = parseInt(process.env.SALT, 10) || 10;
const SECRET_KEY = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const PORT = process.env.PORT || 5000;

module.exports = {
  MONGO_DB_URL,
  SALT,
  SECRET_KEY,
  JWT_EXPIRES_IN,
  PORT,
};
