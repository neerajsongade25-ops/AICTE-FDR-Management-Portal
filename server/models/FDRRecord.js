const mongoose = require('mongoose');

const renewalHistoryEntry = new mongoose.Schema({
  version: Number,
  fdrNumber: String,
  issueDate: Date,
  maturityDate: Date,
  amount: Number,
  archivedAt: { type: Date, default: Date.now }
}, { _id: false });

const fdrRecordSchema = new mongoose.Schema({
  // Institution Submitted Data
  fdrNumber: { type: String, required: true },
  institutionId: { type: String, required: true },
  institutionName: { type: String, required: true },
  aictePermanentId: { type: String },
  courseCategory: { type: String, enum: ['ENGINEERING', 'PHARMACY', 'MBA', 'MCA', 'ARCHITECTURE', 'POLYTECHNIC'] },
  issuingBank: { type: String, required: true },
  branchIfsc: { type: String },
  depositAmount: { type: Number, required: true },
  issueDate: { type: Date, required: true },
  maturityDate: { type: Date, required: true },
  lockInYears: { type: Number, default: 3 },
  jointHolderName: { type: String },
  lienMarkedToAicte: { type: Boolean, default: false },

  // Document Security & OCR Data
  fileName: { type: String },
  fileBase64: { type: String },
  fileSha256Hash: { type: String },
  ocrExtractedData: {
    extractedAmount: Number,
    extractedFdrNumber: String,
    extractedBank: String,
    extractedMaturityDate: Date,
    extractedIssueDate: Date,
    hasJointAccountClause: Boolean,
    hasAicteLienClause: Boolean,
    ocrConfidenceScore: Number
  },

  // Bank Independently Confirmed Data
  bankVerificationStatus: {
    type: String,
    enum: ['PENDING', 'VERIFIED', 'MISMATCH', 'FAKE_REJECTED'],
    default: 'PENDING'
  },
  bankConfirmedData: {
    confirmedAmount: Number,
    confirmedMaturityDate: Date,
    confirmedJointHolder: String,
    confirmedLienActive: Boolean,
    verifiedByBankOfficer: String,
    verifiedAt: Date,
    bankRemarks: String
  },

  // Lifecycle & Status
  status: {
    type: String,
    enum: [
      'SUBMITTED',
      'UNDER_SCRUTINY',
      'DISCREPANCY_FLAGGED',
      'ACTIVE_VERIFIED',
      'EXPIRING_SOON',
      'MATURED_OVERDUE',
      'RENEWED',
      'RELEASE_REQUESTED',
      'RELEASED_REFUNDED',
      'FORFEITED_ENCASHED'
    ],
    default: 'SUBMITTED'
  },

  // Discrepancy Details
  discrepancyFlags: [{ type: String }],
  scrutinyRemarks: { type: String },

  // Renewal History Chain
  version: { type: Number, default: 1 },
  parentFdrId: { type: mongoose.Schema.Types.ObjectId, ref: 'FDRRecord' },
  renewalHistory: [renewalHistoryEntry],

  // Release / Refund Workflow
  releaseRequest: {
    requestedAt: Date,
    reason: String,
    checklist: {
      lockInCompleted: { type: Boolean, default: false },
      noCourtCase: { type: Boolean, default: false },
      noFacultyDues: { type: Boolean, default: false },
      complianceVerified: { type: Boolean, default: false }
    },
    scrutinyRecommendation: { type: String, enum: ['PENDING', 'RECOMMENDED', 'NOT_RECOMMENDED'], default: 'PENDING' },
    directorApprovalStatus: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
    nocReferenceNumber: String
  },

  // Forfeiture Details
  forfeitureDetails: {
    initiatedBy: String,
    violationReason: String,
    encashmentOrderNo: String,
    forfeitedAt: Date
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

fdrRecordSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('FDRRecord', fdrRecordSchema);
