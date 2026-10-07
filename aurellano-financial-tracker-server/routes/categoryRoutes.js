const express = require('express');
const {
  createCategory,
  deactivateCategory,
  getAllCategories,
  updateCategory,
} = require('../controllers/categoryController');
const { protect } = require('../middleware/authMiddleware');
const {
  categoryUpdateValidation,
  categoryValidation,
  mongoIdParamValidation,
} = require('../middleware/validationMiddleware');

const router = express.Router();

router.use(protect);
router.get('/getAllCategories', getAllCategories);
router.post('/create', categoryValidation, createCategory);
router.put('/update/:id', mongoIdParamValidation, categoryUpdateValidation, updateCategory);
router.delete('/delete/:id', mongoIdParamValidation, deactivateCategory);

module.exports = router;
