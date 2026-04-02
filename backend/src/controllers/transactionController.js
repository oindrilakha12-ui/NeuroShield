// Transaction controller — create transaction, call ML, store fraud log
const axios = require('axios');
const Transaction = require('../models/Transaction');
const FraudLog = require('../models/FraudLog');
const User = require('../models/User');

// helper — figure out if time is night (10pm to 6am)
function isNightTime(timeInSeconds) {
  const hour = Math.floor(timeInSeconds / 3600) % 24;
  return hour >= 22 || hour < 6;
}

// helper — build or update user profile from their transaction history
async function ensureUserProfile(userId) {
  const user = await User.findById(userId);
  if (!user) return null;

  // if profile already set, return it
  if (user.profile && user.profile.baseLocation) return user.profile;

  // build profile from last 10 transactions
  const recentTxs = await Transaction.find({ userId }).sort({ createdAt: -1 }).limit(10);
  if (recentTxs.length === 0) return null;

  // most common location and device
  const locationCount = {};
  const deviceCount = {};
  let totalAmount = 0;

  recentTxs.forEach(tx => {
    locationCount[tx.location] = (locationCount[tx.location] || 0) + 1;
    deviceCount[tx.device]     = (deviceCount[tx.device] || 0) + 1;
    totalAmount += tx.amount;
  });

  const baseLocation = Object.keys(locationCount).sort((a, b) => locationCount[b] - locationCount[a])[0];
  const baseDevice   = Object.keys(deviceCount).sort((a, b) => deviceCount[b] - deviceCount[a])[0];
  const avgAmount    = Math.floor(totalAmount / recentTxs.length);

  // save profile to DB
  await User.findByIdAndUpdate(userId, { profile: { baseLocation, baseDevice, avgAmount } });
  console.log(`[Profile] Built for user ${user.email}: ${baseLocation} | ${baseDevice} | avg ₹${avgAmount}`);

  return { baseLocation, baseDevice, avgAmount };
}

// helper — calculate rule based risk score using user profile
async function calculateRisk(userId, amount, location, device, time) {
  let riskScore = 0;
  let reasons = [];

  const lastTx = await Transaction.findOne({ userId }).sort({ createdAt: -1 });
  const profile = await ensureUserProfile(userId);

  // high amount check — compare against profile avg if available
  const highAmountThreshold = profile && profile.avgAmount ? profile.avgAmount * 5 : 50000;
  if (amount > highAmountThreshold) {
    riskScore += 30;
    reasons.push('High amount');
    console.log('risk +30: high amount');
  }

  // new location — compare against profile base location
  const baseLocation = profile ? profile.baseLocation : (lastTx ? lastTx.location : null);
  if (baseLocation && baseLocation !== location) {
    riskScore += 25;
    reasons.push('New location');
    console.log('risk +25: location changed from', baseLocation, '->', location);
  }

  // new device — compare against profile base device
  const baseDevice = profile ? profile.baseDevice : (lastTx ? lastTx.device : null);
  if (baseDevice && baseDevice !== device) {
    riskScore += 20;
    reasons.push('New device');
    console.log('risk +20: device changed from', baseDevice, '->', device);
  }

  // odd time check
  if (isNightTime(time)) {
    riskScore += 15;
    reasons.push('Odd time (night)');
    console.log('risk +15: night time transaction');
  }

  let status = 'SAFE';
  if (riskScore >= 70) status = 'FRAUD';
  else if (riskScore >= 40) status = 'SUSPICIOUS';

  const reason = reasons.length > 0 ? reasons.join(' and ') : 'Normal transaction';
  return { riskScore, status, reason };
}

// POST /api/transactions
const createTransaction = async (req, res) => {
  try {
    const { amount, time, location, device } = req.body;
    const userId = req.user.id;

    // Save transaction
    const transaction = await Transaction.create({ userId, amount, time, location, device });
    console.log('transaction saved:', transaction._id);

    // calculate rule based risk
    const { riskScore, status, reason } = await calculateRisk(userId, amount, location, device, time);
    console.log('risk result:', riskScore, status, reason);

    // Call ML service (optional, wont crash if down)
    let mlScore = 0;
    let isFraud = false;
    try {
      const mlRes = await axios.post(`${process.env.ML_SERVICE_URL}/predict`, {
        amount, time, location, device
      });
      mlScore = mlRes.data.fraud_score;
      isFraud = mlRes.data.is_fraud;
      console.log('ml score:', mlScore);
    } catch (mlErr) {
      console.error('ML service not available, using rule-based only:', mlErr.message);
      // fallback: use rule based score
      mlScore = riskScore / 100;
      isFraud = status === 'FRAUD';
    }

    // combine ml + rule score (simple average)
    const combinedScore = parseFloat(((mlScore + riskScore / 100) / 2).toFixed(4));

    // Save fraud log
    const fraudLog = await FraudLog.create({
      transactionId: transaction._id,
      score: combinedScore,
      isFraud,
      riskScore,
      status,
      reason
    });

    // basic websocket placeholder
    if (riskScore > 70) {
      console.log('⚠️ Fraud Alert Triggered for transaction:', transaction._id);
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

    res.status(201).json({ transaction, riskScore, status, reason, fraudLog });
  } catch (err) {
    console.error('createTransaction error:', err.message);
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
