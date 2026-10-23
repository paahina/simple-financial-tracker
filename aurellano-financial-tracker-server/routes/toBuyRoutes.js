const express = require('express');
const {
  completeToBuy,
  createToBuy,
  deleteToBuy,
  getAllToBuy,
  getToBuyById,
  updateToBuy,
} = require('../controllers/toBuyController');
const { protect } = require('../middleware/authMiddleware');
const {
  mongoIdParamValidation,
  toBuyCompleteValidation,
  toBuyValidation,
} = require('../middleware/validationMiddleware');

const router = express.Router();

router.use(protect);
router.get('/getAll', getAllToBuy);
router.get('/get/:id', mongoIdParamValidation, getToBuyById);
router.post('/create', toBuyValidation, createToBuy);
router.put('/update/:id', mongoIdParamValidation, toBuyValidation, updateToBuy);
router.delete('/delete/:id', mongoIdParamValidation, deleteToBuy);
router.post('/complete/:id', mongoIdParamValidation, toBuyCompleteValidation, completeToBuy);

module.exports = router;
