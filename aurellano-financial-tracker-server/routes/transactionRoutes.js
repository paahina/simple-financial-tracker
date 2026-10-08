const express = require('express');
const {
  createTransaction,
  deleteTransaction,
  getAllTransactions,
  getTransactionDays,
  getTransactionById,
  updateTransaction,
} = require('../controllers/transactionController');
const { protect } = require('../middleware/authMiddleware');
const {
  mongoIdParamValidation,
  transactionUpdateValidation,
  transactionValidation,
} = require('../middleware/validationMiddleware');

const router = express.Router();

router.use(protect);
router.get('/getAllTransactions', getAllTransactions);
router.get('/days', getTransactionDays);
router.get('/get/:id', mongoIdParamValidation, getTransactionById);
router.post('/create', transactionValidation, createTransaction);
router.put(
  '/update/:id',
  mongoIdParamValidation,
  transactionUpdateValidation,
  updateTransaction,
);
router.delete('/delete/:id', mongoIdParamValidation, deleteTransaction);

module.exports = router;
