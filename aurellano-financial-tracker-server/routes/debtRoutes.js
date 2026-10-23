const express = require('express');
const {
  addToBalance,
  createAddition,
  createDebt,
  createDebtPayment,
  deleteAddition,
  deleteDebt,
  deleteDebtPayment,
  getAllDebts,
  getDebtById,
  getDebtPayments,
  updateAddition,
  updateDebt,
  updateDebtPayment,
} = require('../controllers/debtController');
const { protect } = require('../middleware/authMiddleware');
const {
  debtAdditionUpdateValidation,
  debtAddToBalanceValidation,
  debtAdditionValidation,
  debtPaymentUpdateValidation,
  debtPaymentValidation,
  debtUpdateValidation,
  debtValidation,
  mongoIdParamValidation,
} = require('../middleware/validationMiddleware');

const router = express.Router();

router.use(protect);
router.get('/getAllDebts', getAllDebts);
router.get('/getPayments/:id', mongoIdParamValidation, getDebtPayments);
router.post('/createAddition', debtAdditionValidation, createAddition);
router.post('/addToBalance', debtAddToBalanceValidation, addToBalance);
router.put('/updateAddition/:id', mongoIdParamValidation, debtAdditionUpdateValidation, updateAddition);
router.delete('/deleteAddition/:id', mongoIdParamValidation, deleteAddition);
router.post('/createPayment', debtPaymentValidation, createDebtPayment);
router.put(
  '/updatePayment/:id',
  mongoIdParamValidation,
  debtPaymentUpdateValidation,
  updateDebtPayment,
);
router.delete('/deletePayment/:id', mongoIdParamValidation, deleteDebtPayment);
router.get('/get/:id', mongoIdParamValidation, getDebtById);
router.post('/create', debtValidation, createDebt);
router.put('/update/:id', mongoIdParamValidation, debtUpdateValidation, updateDebt);
router.delete('/delete/:id', mongoIdParamValidation, deleteDebt);

module.exports = router;
