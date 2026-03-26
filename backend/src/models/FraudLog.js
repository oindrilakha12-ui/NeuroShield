// FraudLog model — stores ML fraud score and user feedback
const mongoose = require('mongoose');

const fraudLogSchema = new mongoose.Schema({
  transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', required: true },
  score:         { type: Number, required: true },
  isFraud:       { type: Boolean, required: true },
  feedback:      { type: String, enum: ['valid', 'fraud', null], default: null }
}, { timestamps: true });

module.exports = mongoose.model('FraudLog', fraudLogSchema);
