const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['INSTITUTION', 'SCRUTINY_OFFICER', 'BANK_OFFICER', 'DIRECTOR'],
    required: true
  },
  institutionId: { type: String },
  institutionName: { type: String },
  aictePermanentId: { type: String },
  bankName: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
