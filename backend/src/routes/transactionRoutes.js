// Transaction routes — protected by JWT middleware
const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const { createTransaction, getTransactions, submitFeedback } = require('../controllers/transactionController');

router.post('/', protect, createTransaction);
router.get('/', protect, getTransactions);
router.post('/:id/feedback', protect, submitFeedback);

module.exports = router;
