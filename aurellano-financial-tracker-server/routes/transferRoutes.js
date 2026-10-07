const express = require('express');
const {
  createTransfer,
  deleteTransfer,
  getAllTransfers,
  getTransferById,
  updateTransfer,
} = require('../controllers/transferController');
const { protect } = require('../middleware/authMiddleware');
const {
  mongoIdParamValidation,
  transferUpdateValidation,
  transferValidation,
} = require('../middleware/validationMiddleware');

const router = express.Router();

router.use(protect);
router.get('/getAllTransfers', getAllTransfers);
router.get('/get/:id', mongoIdParamValidation, getTransferById);
router.post('/create', transferValidation, createTransfer);
router.put('/update/:id', mongoIdParamValidation, transferUpdateValidation, updateTransfer);
router.delete('/delete/:id', mongoIdParamValidation, deleteTransfer);

module.exports = router;
