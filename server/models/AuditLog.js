const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  module: { type: String, required: true },
  fdrNumber: { type: String },
  performedBy: { type: String, required: true },
  userRole: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  ipAddress: { type: String, default: '0.0.0.0' },
  previousState: { type: mongoose.Schema.Types.Mixed },
  newState: { type: mongoose.Schema.Types.Mixed },
  recordHash: { type: String }
});

// Make audit logs immutable - no updates allowed
auditLogSchema.pre('findOneAndUpdate', function() {
  throw new Error('Audit logs are immutable and cannot be modified');
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
