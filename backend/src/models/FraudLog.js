// FraudLog model — stores ML fraud score, rule-based risk, and user feedback
const mongoose = require('mongoose');

const fraudLogSchema = new mongoose.Schema({
  transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', required: true },
  score:         { type: Number, required: true },
  isFraud:       { type: Boolean, required: true },
  feedback:      { type: String, enum: ['valid', 'fraud', null], default: null },
  // rule-based fields
  riskScore:     { type: Number, default: 0 },
  status:        { type: String, enum: ['SAFE', 'SUSPICIOUS', 'FRAUD'], default: 'SAFE' },
  reason:        { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('FraudLog', fraudLogSchema);
