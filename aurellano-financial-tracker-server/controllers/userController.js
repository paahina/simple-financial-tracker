const User = require('../models/userModel');
const { HttpStatus } = require('../config/constants');
const { generateToken } = require('../utils/jwt');
const { blacklistToken } = require('../middleware/tokenBlacklist');
const { isAdmin, forbidIfNotOwner } = require('../middleware/authMiddleware');

const toPublicUser = (user) => {
  const userObj = user.toObject();
  delete userObj.password;
  return userObj;
};

const getUsers = async (_req, res) => {
  try {
    const users = await User.find().select('-password');
    res.status(HttpStatus.OK).json(users);
  } catch (error) {
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(HttpStatus.NOT_FOUND).json({ message: 'User not found' });
    }
    if (forbidIfNotOwner(user._id, req, res)) return;
    res.status(HttpStatus.OK).json(user);
  } catch (error) {
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

const createUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const user = await User.create({
      name,
      email,
      password,
      role: 'USER',
    });
    const token = generateToken(user);
    res.status(HttpStatus.CREATED).json({
      message: 'Account created',
      token,
      user: toPublicUser(user),
    });
  } catch (error) {
    res.status(HttpStatus.BAD_REQUEST).json({ message: error.message });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user || !(await user.comparePassword(password))) {
      return res
        .status(HttpStatus.UNAUTHORIZED)
        .json({ message: 'Invalid email or password' });
    }

    const token = generateToken(user);
    res.status(HttpStatus.OK).json({
      message: 'Login successful',
      token,
      user: toPublicUser(user),
    });
  } catch (error) {
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

const logoutUser = async (req, res) => {
  try {
    blacklistToken(req.token);
    res.status(HttpStatus.OK).json({ message: 'Logout successful' });
  } catch (error) {
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

const getSession = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res
        .status(HttpStatus.UNAUTHORIZED)
        .json({ message: 'Session is no longer valid' });
    }

    res.status(HttpStatus.OK).json({ user });
  } catch (error) {
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(HttpStatus.NOT_FOUND).json({ message: 'User not found' });
    }
    if (forbidIfNotOwner(user._id, req, res)) return;

    const { currentPassword, password, name, email, role } = req.body;

    if (password) {
      if (!isAdmin(req)) {
        if (!currentPassword) {
          return res
            .status(HttpStatus.BAD_REQUEST)
            .json({ message: 'Current password is required' });
        }
        const matches = await user.comparePassword(currentPassword);
        if (!matches) {
          return res
            .status(HttpStatus.UNAUTHORIZED)
            .json({ message: 'Current password is incorrect' });
        }
      }
      user.password = password;
    }

    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (isAdmin(req) && role !== undefined && user.role !== 'SYSTEM_ADMIN') {
      user.role = role;
    }

    await user.save();
    res.status(HttpStatus.OK).json(toPublicUser(user));
  } catch (error) {
    res.status(HttpStatus.BAD_REQUEST).json({ message: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(HttpStatus.NOT_FOUND).json({ message: 'User not found' });
    }
    res.status(HttpStatus.OK).json({ message: 'User deleted' });
  } catch (error) {
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  loginUser,
  logoutUser,
  getSession,
  updateUser,
  deleteUser,
};
