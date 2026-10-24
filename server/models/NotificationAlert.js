const mongoose = require('mongoose');

const notificationAlertSchema = new mongoose.Schema({
  recipientRole: { type: String, required: true },
  institutionId: { type: String },
  fdrNumber: { type: String },
  alertType: {
    type: String,
    enum: [
      'EXPIRING_90_DAYS',
      'EXPIRING_60_DAYS',
      'EXPIRING_30_DAYS',
      'EXPIRING_7_DAYS',
      'OVERDUE',
      'DISCREPANCY',
      'RELEASE_APPROVED',
      'FORFEITURE_NOTICE',
      'BANK_VERIFIED',
      'SUBMISSION_RECEIVED',
      'RENEWAL_SUBMITTED'
    ],
    required: true
  },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('NotificationAlert', notificationAlertSchema);
