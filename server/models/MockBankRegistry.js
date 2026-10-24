const mongoose = require('mongoose');

const mockBankRegistrySchema = new mongoose.Schema({
  fdrNumber: { type: String, required: true, unique: true },
  bankName: { type: String, required: true },
  ifsc: { type: String, required: true },
  actualAmount: { type: Number, required: true },
  actualIssueDate: { type: Date, required: true },
  actualMaturityDate: { type: Date, required: true },
  isJointWithAicte: { type: Boolean, default: false },
  isLienMarked: { type: Boolean, default: false },
  accountStatus: { type: String, enum: ['ACTIVE', 'MATURED', 'CLOSED', 'FROZEN'], default: 'ACTIVE' },
  holderName: { type: String },
  holderInstitution: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('MockBankRegistry', mockBankRegistrySchema);
