// Transaction controller — create transaction, calculate fraud risk, store fraud log
const axios = require('axios');
const Transaction = require('../models/Transaction');
const FraudLog = require('../models/FraudLog');
const User = require('../models/User');

// ─────────────────────────────────────────────
// helper — get user profile from DB
// ─────────────────────────────────────────────
async function getUserProfile(userId) {
  const user = await User.findById(userId);
  if (user && user.profile && user.profile.baseLocation) {
    return user.profile;
  }
  return null;
}

// ─────────────────────────────────────────────
// helper — core fraud risk calculation
// compares transaction against user profile
// ─────────────────────────────────────────────
async function calculateRisk(userId, amount, location, device) {
  let risk = 0;
  let reasons = [];

  const profile = await getUserProfile(userId);

  // print profile vs current transaction for debugging
  console.log('─────────────────────────────────');
  console.log('[RiskCheck] User Profile  :', profile);
  console.log('[RiskCheck] New Transaction:', { amount, location, device });
  console.log('─────────────────────────────────');

  if (!profile) {
    // no profile yet — cant compare, return safe
    console.log('[RiskCheck] No profile found, skipping risk check');
    return { risk: 0, status: 'SAFE', reasons: ['No profile data yet'] };
  }

  // check 1 — location changed
  if (location !== profile.baseLocation) {
    risk += 30;
    reasons.push('New location');
    console.log(`[RiskCheck] +30 | Location changed: ${profile.baseLocation} → ${location}`);
  }

  // check 2 — device changed
  if (device !== profile.baseDevice) {
    risk += 25;
    reasons.push('New device');
    console.log(`[RiskCheck] +25 | Device changed: ${profile.baseDevice} → ${device}`);
  }

  // check 3 — amount way higher than usual
  if (profile.avgAmount && amount > profile.avgAmount * 3) {
    risk += 35;
    reasons.push('High amount');
    console.log(`[RiskCheck] +35 | High amount: ₹${amount} vs avg ₹${profile.avgAmount}`);
  }

  // determine status
  let status = 'SAFE';
  if (risk >= 70)      status = 'FRAUD';
  else if (risk >= 30) status = 'SUSPICIOUS';

  console.log(`[RiskCheck] Final → riskScore: ${risk} | status: ${status} | reasons: ${reasons.join(', ') || 'none'}`);

  return { risk, status, reasons };
}

// ─────────────────────────────────────────────
// POST /api/transactions
// ─────────────────────────────────────────────
const createTransaction = async (req, res) => {
  try {
    const { amount, time, location, device } = req.body;
    const userId = req.user.id;

    // save transaction
    const transaction = await Transaction.create({ userId, amount, time, location, device });
    console.log('[Transaction] Saved:', transaction._id);

    // calculate risk using user profile
    const { risk: riskScore, status, reasons } = await calculateRisk(userId, amount, location, device);

    // call ML service (optional — wont crash if down)
    let mlScore = 0;
    let isFraud = false;
    try {
      const mlRes = await axios.post(`${process.env.ML_SERVICE_URL}/predict`, { amount, time, location, device });
      mlScore = mlRes.data.fraud_score;
      isFraud = mlRes.data.is_fraud;
      console.log('[ML] Score:', mlScore);
    } catch (mlErr) {
      // fallback to rule based
      mlScore = riskScore / 100;
      isFraud = status === 'FRAUD';
      console.log('[ML] Service unavailable, using rule-based fallback');
    }

    // combine ml + rule score
    const combinedScore = parseFloat(((mlScore + riskScore / 100) / 2).toFixed(4));

    // save fraud log
    const fraudLog = await FraudLog.create({
      transactionId: transaction._id,
      score:    combinedScore,
      isFraud,
      riskScore,
      status,
      reason: reasons.length > 0 ? reasons.join(' and ') : 'Normal transaction'
    });

    // emit socket alert if fraud
    if (riskScore >= 70) {
      console.log('⚠️  Fraud Alert Triggered for transaction:', transaction._id);
      const io = req.app.get('io');
      if (io) {
        io.emit('fraud_alert', {
          transactionId: transaction._id,
          score: combinedScore,
          riskScore,
          status,
          message: 'Suspicious Transaction Detected'
        });
      }
    }

    res.status(201).json({ transaction, riskScore, status, reasons, fraudLog });

  } catch (err) {
    console.error('[Transaction] Error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────
// GET /api/transactions
// ─────────────────────────────────────────────
const getTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────
// POST /api/transactions/:id/feedback
// ─────────────────────────────────────────────
const submitFeedback = async (req, res) => {
  try {
    const { feedback } = req.body;
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
