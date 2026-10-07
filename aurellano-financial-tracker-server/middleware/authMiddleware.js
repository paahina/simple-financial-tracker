const { HttpStatus } = require('../config/constants');
const { verifyToken } = require('../utils/jwt');
const { isBlacklisted } = require('./tokenBlacklist');
const User = require('../models/userModel');

const getBearerToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7).trim();
};

const protect = async (req, res, next) => {
  const token = getBearerToken(req);

  if (!token) {
    return res
      .status(HttpStatus.UNAUTHORIZED)
      .json({ message: 'No token provided' });
  }

  if (isBlacklisted(token)) {
    return res.status(HttpStatus.UNAUTHORIZED).json({
      message: 'Session has ended. Please log in again.',
    });
  }

  try {
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id).select('role email');
    if (!user) {
      return res
        .status(HttpStatus.UNAUTHORIZED)
        .json({ message: 'Session is no longer valid' });
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    };
    req.token = token;
    next();
  } catch {
    return res
      .status(HttpStatus.UNAUTHORIZED)
      .json({ message: 'Invalid or expired token' });
  }
};

const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(HttpStatus.FORBIDDEN).json({
        message: 'You do not have permission to perform this action',
      });
    }
    next();
  };

const isAdmin = (req) => req.user?.role === 'SYSTEM_ADMIN';

const forbidIfNotOwner = (resourceUserId, req, res) => {
  if (isAdmin(req)) return false;
  if (!resourceUserId || resourceUserId.toString() !== req.user.id) {
    res.status(HttpStatus.FORBIDDEN).json({
      message: 'You do not have permission to access this resource',
    });
    return true;
  }
  return false;
};

module.exports = { protect, authorize, isAdmin, forbidIfNotOwner };
