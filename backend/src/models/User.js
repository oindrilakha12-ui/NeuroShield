// User model — stores email and hashed password
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },
  // user behavior profile — used in fraud detection
  profile: {
    baseLocation: { type: String, default: null },
    baseDevice:   { type: String, default: null },
    avgAmount:    { type: Number, default: null }
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
