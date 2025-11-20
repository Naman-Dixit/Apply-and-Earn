const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required:true },
  email: { type: String, required:true, unique:true, lowercase:true, trim:true },
  password: { type: String, required:true },
  referralCode: { type: String, required:true, unique:true },
  coins: { type: Number, default: 0 },
  appliedReferral: { type: String, default: null } // store code if applied
}, { timestamps:true });

module.exports = mongoose.model('User', userSchema);
