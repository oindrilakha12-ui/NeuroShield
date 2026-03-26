// Transaction controller — create transaction, call ML, store fraud log
const axios = require('axios');
const Transaction = require('../models/Transaction');
const FraudLog = require('../models/FraudLog');

// POST /api/transactions
const createTransaction = async (req, res) => {
  try {
    const { amount, time, location, device } = req.body;
    const userId = req.user.id;

    // Save transaction
    const transaction = await Transaction.create({ userId, amount, time, location, device });

    // Call ML service
    let score = 0;
    let isFraud = false;
    try {
      const mlRes = await axios.post(`${process.env.ML_SERVICE_URL}/predict`, {
        amount, time, location, device
      });
      score = mlRes.data.fraud_score;
      isFraud = mlRes.data.is_fraud;
    } catch (mlErr) {
      console.error('ML service error:', mlErr.message);
    }

    // Save fraud log
    const fraudLog = await FraudLog.create({ transactionId: transaction._id, score, isFraud });

    // Emit real-time alert if fraud detected
    if (isFraud) {
      const io = req.app.get('io');
      io.emit('fraud_alert', {
        transactionId: transaction._id,
        score,
        message: 'Suspicious Transaction Detected'
      });
    }

    res.status(201).json({ transaction, fraudLog });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/transactions
const getTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/transactions/:id/feedback
const submitFeedback = async (req, res) => {
  try {
    const { feedback } = req.body; // 'valid' or 'fraud'
    const log = await FraudLog.findOneAndUpdate(
      { transactionId: req.params.id },
      { feedback },
      { new: true }
    );
    if (!log) return res.status(404).json({ message: 'Fraud log not found' });
    res.json(log);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createTransaction, getTransactions, submitFeedback };
