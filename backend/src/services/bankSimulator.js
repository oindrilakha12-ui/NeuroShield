// bankSimulator.js — fake bank service that auto-generates transactions
// simulates real banking flow without connecting to any real bank API

const Transaction = require('../models/Transaction');
const FraudLog = require('../models/FraudLog');
const User = require('../models/User');

// pool of realistic fake data
const locations = ['Mumbai', 'Delhi', 'Kolkata', 'Chennai', 'Bangalore', 'Hyderabad', 'Dubai', 'London', 'New York'];
const devices   = ['iPhone 14', 'Samsung Galaxy', 'MacBook', 'Windows PC', 'iPad', 'OnePlus', 'Unknown Device'];

// helper — random item from array
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// helper — random amount, sometimes suspiciously high
function randomAmount() {
  const isSuspicious = Math.random() < 0.2; // 20% chance of high amount
  if (isSuspicious) return Math.floor(Math.random() * 100000) + 50001;
  return Math.floor(Math.random() * 10000) + 100;
}

// helper — current time in seconds since midnight
function currentTimeSeconds() {
  const now = new Date();
  return now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
}

// helper — night time check
function isNightTime(t) {
  const hour = Math.floor(t / 3600) % 24;
  return hour >= 22 || hour < 6;
}

// rule based risk (same logic as controller)
async function calculateRisk(userId, amount, location, device, time) {
  let riskScore = 0;
  let reasons = [];

  const lastTx = await Transaction.findOne({ userId }).sort({ createdAt: -1 });

  if (amount > 50000)                          { riskScore += 30; reasons.push('High amount'); }
  if (lastTx && lastTx.location !== location)  { riskScore += 25; reasons.push('New location'); }
  if (lastTx && lastTx.device !== device)      { riskScore += 20; reasons.push('New device'); }
  if (isNightTime(time))                       { riskScore += 15; reasons.push('Odd time (night)'); }

  let status = 'SAFE';
  if (riskScore >= 70)      status = 'FRAUD';
  else if (riskScore >= 40) status = 'SUSPICIOUS';

  const reason = reasons.length > 0 ? reasons.join(' and ') : 'Normal transaction';
  return { riskScore, status, reason };
}

// main simulator — generates one fake transaction for a random user
async function simulateTransaction(io) {
  try {
    // pick a random user from DB
    const users = await User.find({});
    if (users.length === 0) {
      console.log('[BankSim] No users found, skipping...');
      return;
    }

    const user = users[Math.floor(Math.random() * users.length)];
    const amount   = randomAmount();
    const location = pick(locations);
    const device   = pick(devices);
    const time     = currentTimeSeconds();

    // save transaction
    const transaction = await Transaction.create({
      userId: user._id,
      amount,
      location,
      device,
      time
    });

    // calculate risk
    const { riskScore, status, reason } = await calculateRisk(user._id, amount, location, device, time);

    // save fraud log
    const fraudLog = await FraudLog.create({
      transactionId: transaction._id,
      score: parseFloat((riskScore / 100).toFixed(4)),
      isFraud: status === 'FRAUD',
      riskScore,
      status,
      reason
    });

    console.log(`[BankSim] 💳 New transaction | User: ${user.email} | Amount: ₹${amount} | ${location} | ${status} (${riskScore})`);

    // emit to frontend via socket
    if (io) {
      io.emit('new_transaction', { transaction, riskScore, status, reason, fraudLog });

      // fraud alert
      if (riskScore > 70) {
        console.log(`[BankSim] ⚠️  Fraud Alert! Transaction ${transaction._id}`);
        io.emit('fraud_alert', {
          transactionId: transaction._id,
          score: riskScore / 100,
          riskScore,
          status,
          message: 'Suspicious Transaction Detected'
        });
      }
    }

  } catch (err) {
    console.error('[BankSim] Error:', err.message);
  }
}

// start simulator — generates a transaction every X seconds
function startBankSimulator(io, intervalSeconds = 5) {
  console.log(`[BankSim] 🏦 Bank simulator started — generating transactions every ${intervalSeconds}s`);
  setInterval(() => simulateTransaction(io), intervalSeconds * 1000);
}

module.exports = startBankSimulator;
