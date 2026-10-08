const Category = require('../models/categoryModel');
const { HttpStatus } = require('../config/constants');
const { isPaged, parsePagination, paginatedResponse } = require('../utils/pagination');
const { FinanceError, sendFinanceError } = require('../utils/finance');

const DEFAULTS = {
  EXPENSE: [
    'Food',
    'Transportation',
    'Bills',
    'Shopping',
    'Entertainment',
    'Health',
    'Education',
    'Subscriptions',
    'Other',
  ],
  INCOME: ['Salary', 'Freelance', 'Business', 'Interest', 'Gift', 'Other'],
};

const ensureDefaultCategories = async (userId) => {
  const count = await Category.countDocuments({ userId });
  if (count > 0) return;
  const docs = [];
  for (const type of Object.keys(DEFAULTS)) {
    for (const name of DEFAULTS[type]) {
      docs.push({ userId, name, type, isActive: true });
    }
  }
  await Category.insertMany(docs);
};

const requireCategory = async (userId, categoryId, expectedType) => {
  const category = await Category.findOne({ _id: categoryId, userId, isActive: true });
  if (!category) {
    throw new FinanceError('Category not found', HttpStatus.NOT_FOUND);
  }
  if (expectedType && category.type !== expectedType) {
    throw new FinanceError('Category type does not match the transaction type');
  }
  return category;
};

const getAllCategories = async (req, res) => {
  try {
    await ensureDefaultCategories(req.user.id);
    const filter = { userId: req.user.id };
    if (req.query.type) filter.type = req.query.type;
    if (req.query.includeInactive !== 'true') filter.isActive = true;
    const sort = { type: 1, name: 1 };
    if (!isPaged(req.query)) {
      const categories = await Category.find(filter).sort(sort);
      res.status(HttpStatus.OK).json(categories);
      return;
    }
    const { page, limit, skip } = parsePagination(req.query);
    const [total, categories] = await Promise.all([
      Category.countDocuments(filter),
      Category.find(filter).sort(sort).skip(skip).limit(limit),
    ]);
    res.status(HttpStatus.OK).json(paginatedResponse({ data: categories, total, page, limit }));
  } catch (error) {
    sendFinanceError(res, error);
  }
};

const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findOne({ _id: req.params.id, userId: req.user.id });
    if (!category) {
      return res.status(HttpStatus.NOT_FOUND).json({ message: 'Category not found' });
    }
    res.status(HttpStatus.OK).json(category);
  } catch (error) {
    sendFinanceError(res, error);
  }
};

const createCategory = async (req, res) => {
  try {
    await ensureDefaultCategories(req.user.id);
    const category = await Category.create({
      userId: req.user.id,
      name: req.body.name,
      type: req.body.type,
      isActive: true,
    });
    res.status(HttpStatus.CREATED).json({ message: 'Category created', category });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'Category already exists',
      });
    }
    sendFinanceError(res, error);
  }
};

const updateCategory = async (req, res) => {
  try {
    const category = await Category.findOne({ _id: req.params.id, userId: req.user.id });
    if (!category) {
      return res.status(HttpStatus.NOT_FOUND).json({ message: 'Category not found' });
    }
    if (req.body.name !== undefined) category.name = req.body.name;
    if (req.body.isActive !== undefined) category.isActive = req.body.isActive;
    await category.save();
    res.status(HttpStatus.OK).json(category);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'Category already exists',
      });
    }
    sendFinanceError(res, error);
  }
};

const deactivateCategory = async (req, res) => {
  try {
    const category = await Category.findOne({ _id: req.params.id, userId: req.user.id });
    if (!category) {
      return res.status(HttpStatus.NOT_FOUND).json({ message: 'Category not found' });
    }
    category.isActive = false;
    await category.save();
    res.status(HttpStatus.OK).json({ message: 'Category deactivated', category });
  } catch (error) {
    sendFinanceError(res, error);
  }
};

module.exports = {
  ensureDefaultCategories,
  requireCategory,
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deactivateCategory,
};
