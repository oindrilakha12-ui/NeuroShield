// bankSimulator.js — fake bank service with realistic user behavior patterns
// simulates real banking flow without connecting to any real bank API

const Transaction = require('../models/Transaction');
const FraudLog = require('../models/FraudLog');
const User = require('../models/User');

// nearby cities — realistic travel patterns
const nearbyLocations = {
  'Chennai':   ['Chennai', 'Bangalore', 'Hyderabad'],
  'Mumbai':    ['Mumbai', 'Pune', 'Surat'],
  'Delhi':     ['Delhi', 'Noida', 'Gurgaon'],
  'Bangalore': ['Bangalore', 'Chennai', 'Hyderabad'],
  'Kolkata':   ['Kolkata', 'Bhubaneswar', 'Patna'],
  'Hyderabad': ['Hyderabad', 'Bangalore', 'Chennai'],
  'Pune':      ['Pune', 'Mumbai', 'Nashik'],
};

const suspiciousLocations = ['Dubai', 'London', 'New York', 'Singapore', 'Tokyo'];
const defaultDevices      = ['iPhone 14', 'Samsung Galaxy', 'OnePlus', 'MacBook', 'Windows PC'];
const defaultLocations    = Object.keys(nearbyLocations);

// get or create user profile — now uses DB (User.profile)
async function getProfile(user) {
  // if profile already saved in DB, use it
  if (user.profile && user.profile.baseLocation) {
    return user.profile;
  }

  // first time — assign random base profile and save to DB
  const baseLocation = defaultLocations[Math.floor(Math.random() * defaultLocations.length)];
  const baseDevice   = defaultDevices[Math.floor(Math.random() * defaultDevices.length)];
  const avgAmount    = Math.floor(Math.random() * 8000) + 2000;

  await User.findByIdAndUpdate(user._id, {
    profile: { baseLocation, baseDevice, avgAmount }
  });

  console.log(`[BankSim] 👤 Profile saved for ${user.email} | ${baseLocation} | ${baseDevice} | avg ₹${avgAmount}`);
  return { baseLocation, baseDevice, avgAmount };
}

// helper — amount near average (±30%)
function normalAmount(avg) {
  const variation = avg * 0.3;
  return Math.floor(avg - variation + Math.random() * variation * 2);
}

// helper — suspicious high amount (5x to 15x of avg)
function suspiciousAmount(avg) {
  return Math.floor(avg * (5 + Math.random() * 10));
}

// helper — pick random item from array
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
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

  if (amount > 50000)                         { riskScore += 30; reasons.push('High amount'); }
  if (lastTx && lastTx.location !== location) { riskScore += 25; reasons.push('New location'); }
  if (lastTx && lastTx.device !== device)     { riskScore += 20; reasons.push('New device'); }
  if (isNightTime(time))                      { riskScore += 15; reasons.push('Odd time (night)'); }

  let status = 'SAFE';
  if (riskScore >= 70)      status = 'FRAUD';
  else if (riskScore >= 40) status = 'SUSPICIOUS';

  const reason = reasons.length > 0 ? reasons.join(' and ') : 'Normal transaction';
  return { riskScore, status, reason };
}

// main simulator — generates one transaction based on user behavior profile
async function simulateTransaction(io) {
  try {
    const users = await User.find({});
    if (users.length === 0) {
      console.log('[BankSim] No users found, skipping...');
      return;
    }

    const user    = users[Math.floor(Math.random() * users.length)];
    const profile = await getProfile(user);  // loads from DB
    const time    = currentTimeSeconds();

    // 75% normal, 25% suspicious
    const isSuspicious = Math.random() < 0.25;

    let amount, location, device;

    if (!isSuspicious) {
      // normal transaction — stays close to user's base behavior
      const nearbyPool = nearbyLocations[profile.baseLocation] || [profile.baseLocation];
      location = pick(nearbyPool);
      device   = profile.baseDevice;
      amount   = normalAmount(profile.avgAmount);
      console.log(`[BankSim] ✅ Normal transaction | ${user.email} | ₹${amount} | ${location}`);
    } else {
      // suspicious transaction — different location, device, high amount
      location = pick(suspiciousLocations);
      const otherDevices = ['Unknown Device', 'iPad', 'Pixel 7', 'Burner Phone'];
      device   = pick(otherDevices);
      amount   = suspiciousAmount(profile.avgAmount);
      console.log(`[BankSim] 🚨 Suspicious pattern generated | ${user.email} | ₹${amount} | ${location} | ${device}`);
    }

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

    console.log(`[BankSim] 💳 Saved | Status: ${status} | Risk: ${riskScore} | Reason: ${reason}`);

    // emit to frontend
    if (io) {
      io.emit('new_transaction', { transaction, riskScore, status, reason, fraudLog });

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

// start simulator
function startBankSimulator(io, intervalSeconds = 5) {
  console.log(`[BankSim] 🏦 Bank simulator started — generating transactions every ${intervalSeconds}s`);
  setInterval(() => simulateTransaction(io), intervalSeconds * 1000);
}

module.exports = startBankSimulator;
