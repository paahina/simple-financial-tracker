const { body, param, query, validationResult } = require('express-validator');
const { HttpStatus } = require('../config/constants');

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(HttpStatus.BAD_REQUEST).json({
      message: 'Validation failed',
      errors: errors.array(),
    });
  }
  next();
};

const registerValidation = [
  body('name')
    .isString()
    .withMessage('Name must be a string')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be at least 2 characters long'),
  body('email').isEmail().withMessage('Invalid email address'),
  body('password')
    .isLength({ min: 6, max: 72 })
    .withMessage('Password must be at least 6 characters long'),
  handleValidation,
];

const loginValidation = [
  body('email').isEmail().withMessage('Invalid email address'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidation,
];

const updateUserValidation = [
  body('name')
    .optional()
    .isString()
    .withMessage('Name must be a string')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be at least 2 characters long'),
  body('email').optional().isEmail().withMessage('Invalid email address'),
  body('password')
    .optional()
    .isLength({ min: 6, max: 72 })
    .withMessage('Password must be at least 6 characters long'),
  body('currentPassword').optional().isString(),
  body('role').optional().isIn(['USER', 'SYSTEM_ADMIN']),
  handleValidation,
];

const mongoIdParamValidation = [
  param('id').isMongoId().withMessage('Invalid id parameter'),
  handleValidation,
];

const accountValidation = [
  body('name').isString().trim().isLength({ min: 2, max: 100 }),
  body('type').isIn(['CASH', 'E_WALLET', 'BANK']),
  body('initialBalance').optional().isInt({ min: 0 }),
  body('remainingBalance').optional({ nullable: true }).isInt({ min: 0 }),
  body('currency').optional().isString().trim().isLength({ min: 3, max: 3 }),
  body('description').optional().isString().trim(),
  body('subBalances').optional().isArray(),
  body('subBalances.*.label').optional().isString().trim().isLength({ min: 1, max: 100 }),
  body('subBalances.*.amount').optional().isInt({ min: 0 }),
  handleValidation,
];

const accountUpdateValidation = [
  body('name').optional().isString().trim().isLength({ min: 2, max: 100 }),
  body('type').optional().isIn(['CASH', 'E_WALLET', 'BANK']),
  body('currency').optional().isString().trim().isLength({ min: 3, max: 3 }),
  body('description').optional().isString().trim(),
  body('currentBalance').optional().isInt({ min: 0 }),
  body('remainingBalance').optional({ nullable: true }).isInt({ min: 0 }),
  body('subBalances').optional().isArray(),
  body('subBalances.*.label').optional().isString().trim().isLength({ min: 1, max: 100 }),
  body('subBalances.*.amount').optional().isInt({ min: 0 }),
  handleValidation,
];

const categoryValidation = [
  body('name').isString().trim().isLength({ min: 2, max: 100 }),
  body('type').isIn(['INCOME', 'EXPENSE']),
  handleValidation,
];

const categoryUpdateValidation = [
  body('name').optional().isString().trim().isLength({ min: 2, max: 100 }),
  body('isActive').optional().isBoolean(),
  handleValidation,
];

const transactionValidation = [
  body('accountId').isMongoId(),
  body('type').isIn(['INCOME', 'EXPENSE']),
  body('amount').isInt({ min: 1 }).withMessage('Amount must be a positive integer in centavos'),
  body('label').isString().trim().isLength({ min: 1, max: 100 }),
  body('categoryId').isMongoId(),
  body('description').optional().isString().trim(),
  body('transactionDate').isISO8601().withMessage('Transaction date is required'),
  body('subBalanceId').optional({ nullable: true, checkFalsy: true }).isMongoId(),
  handleValidation,
];

const transactionUpdateValidation = [
  body('accountId').optional().isMongoId(),
  body('type').optional().isIn(['INCOME', 'EXPENSE']),
  body('amount').optional().isInt({ min: 1 }),
  body('label').optional().isString().trim().isLength({ min: 1, max: 100 }),
  body('categoryId').optional().isMongoId(),
  body('description').optional().isString().trim(),
  body('transactionDate').optional().isISO8601(),
  body('subBalanceId').optional({ nullable: true, checkFalsy: true }).isMongoId(),
  handleValidation,
];

const accountIdOrEmpty = (value) => {
  if (value == null || value === '') return true;
  if (!/^[a-fA-F0-9]{24}$/.test(String(value))) {
    throw new Error('Invalid account id');
  }
  return true;
};

const transferValidation = [
  body('fromAccountId').custom(accountIdOrEmpty),
  body('senderName').optional().isString().trim().isLength({ max: 100 }),
  body('toAccountId').custom(accountIdOrEmpty),
  body('recipientName').optional().isString().trim().isLength({ max: 100 }),
  body('amount').isInt({ min: 1 }).withMessage('Amount must be a positive integer in centavos'),
  body('description').optional().isString().trim(),
  body('transactionDate').isISO8601(),
  body('fromSubBalanceId').optional({ nullable: true, checkFalsy: true }).isMongoId(),
  body('toSubBalanceId').optional({ nullable: true, checkFalsy: true }).isMongoId(),
  handleValidation,
];

const transferUpdateValidation = [
  body('fromAccountId').optional().custom(accountIdOrEmpty),
  body('senderName').optional().isString().trim().isLength({ max: 100 }),
  body('toAccountId').optional().custom(accountIdOrEmpty),
  body('recipientName').optional().isString().trim().isLength({ max: 100 }),
  body('amount').optional().isInt({ min: 1 }),
  body('description').optional().isString().trim(),
  body('transactionDate').optional().isISO8601(),
  body('fromSubBalanceId').optional({ nullable: true, checkFalsy: true }).isMongoId(),
  body('toSubBalanceId').optional({ nullable: true, checkFalsy: true }).isMongoId(),
  handleValidation,
];

const debtValidation = [
  body('personName').isString().trim().isLength({ min: 2, max: 100 }),
  body('description').optional().isString().trim(),
  body('originalAmount').isInt({ min: 1 }),
  body('dueDate').optional({ values: 'falsy' }).isISO8601(),
  handleValidation,
];

const debtUpdateValidation = [
  body('personName').optional().isString().trim().isLength({ min: 2, max: 100 }),
  body('description').optional().isString().trim(),
  body('originalAmount').optional().isInt({ min: 1 }),
  body('dueDate').optional({ values: 'falsy' }).isISO8601(),
  handleValidation,
];

const debtAdditionValidation = [
  body('debtId').isMongoId(),
  body('label').isString().trim().isLength({ min: 1, max: 100 }),
  body('amount').isInt({ min: 1 }),
  body('createdAt').isISO8601(),
  handleValidation,
];

const debtAdditionUpdateValidation = [
  body('label').optional().isString().trim().isLength({ min: 1, max: 100 }),
  body('amount').optional().isInt({ min: 1 }),
  body('createdAt').optional().isISO8601(),
  handleValidation,
];

const debtPaymentValidation = [
  body('debtId').isMongoId(),
  body('accountId').isMongoId(),
  body('amount').isInt({ min: 1 }),
  body('paymentDate').isISO8601(),
  body('notes').optional().isString().trim(),
  body('recordAsIncome').optional().isBoolean(),
  body('incomeLabel').optional().isString().trim().isLength({ min: 1, max: 100 }),
  body('incomeCategoryId').optional().isMongoId(),
  body('subBalanceId').optional({ nullable: true, checkFalsy: true }).isMongoId(),
  handleValidation,
];

const debtPaymentUpdateValidation = [
  body('accountId').optional().isMongoId(),
  body('amount').optional().isInt({ min: 1 }),
  body('paymentDate').optional().isISO8601(),
  body('notes').optional().isString().trim(),
  body('recordAsIncome').optional().isBoolean(),
  body('incomeLabel').optional().isString().trim().isLength({ min: 1, max: 100 }),
  body('incomeCategoryId').optional().isMongoId(),
  body('subBalanceId').optional({ nullable: true, checkFalsy: true }).isMongoId(),
  handleValidation,
];

const reportQueryValidation = [
  query('year').optional().isInt({ min: 2000, max: 2100 }),
  query('month').optional().isInt({ min: 1, max: 12 }),
  handleValidation,
];

module.exports = {
  registerValidation,
  loginValidation,
  updateUserValidation,
  mongoIdParamValidation,
  accountValidation,
  accountUpdateValidation,
  categoryValidation,
  categoryUpdateValidation,
  transactionValidation,
  transactionUpdateValidation,
  transferValidation,
  transferUpdateValidation,
  debtValidation,
  debtUpdateValidation,
  debtAdditionValidation,
  debtAdditionUpdateValidation,
  debtPaymentValidation,
  debtPaymentUpdateValidation,
  reportQueryValidation,
};
