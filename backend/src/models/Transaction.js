// Transaction model — stores transaction details per user
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount:   { type: Number, required: true },
  time:     { type: Number, required: true },   // seconds since midnight
  location: { type: String, required: true },
  device:   { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
