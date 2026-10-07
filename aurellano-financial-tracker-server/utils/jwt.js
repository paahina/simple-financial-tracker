const jwt = require('jsonwebtoken');
const { SECRET_KEY, JWT_EXPIRES_IN } = require('../config/config');

const getJwtSecret = () => {
  if (!SECRET_KEY) {
    throw new Error('JWT secret is not configured');
  }
  return SECRET_KEY;
};

const generateToken = (user, expiresIn = JWT_EXPIRES_IN) => {
  return jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    },
    getJwtSecret(),
    { expiresIn },
  );
};

const verifyToken = (token) => jwt.verify(token, getJwtSecret());

module.exports = {
  generateToken,
  verifyToken,
};
