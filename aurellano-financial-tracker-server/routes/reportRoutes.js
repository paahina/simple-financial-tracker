const express = require('express');
const { getMonthlyReport, getYearlyReport } = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');
const { reportQueryValidation } = require('../middleware/validationMiddleware');

const router = express.Router();

router.get('/monthly', protect, reportQueryValidation, getMonthlyReport);
router.get('/yearly', protect, reportQueryValidation, getYearlyReport);

module.exports = router;
