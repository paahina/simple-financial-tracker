const express = require('express');
const {
  createAccount,
  deactivateAccount,
  getAccountActivity,
  getAccountById,
  getAllAccounts,
  updateAccount,
} = require('../controllers/accountController');
const { protect } = require('../middleware/authMiddleware');
const {
  accountUpdateValidation,
  accountValidation,
  mongoIdParamValidation,
} = require('../middleware/validationMiddleware');

const router = express.Router();

router.use(protect);
router.get('/getAllAccounts', getAllAccounts);
router.get('/get/:id/activity', mongoIdParamValidation, getAccountActivity);
router.get('/get/:id', mongoIdParamValidation, getAccountById);
router.post('/create', accountValidation, createAccount);
router.put('/update/:id', mongoIdParamValidation, accountUpdateValidation, updateAccount);
router.delete('/delete/:id', mongoIdParamValidation, deactivateAccount);

module.exports = router;
