const crypto = require('crypto');
const AuditLog = require('../models/AuditLog');

// Generate SHA-256 hash from a buffer
function generateSHA256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

// Generate SHA-256 hash for audit log record integrity
function generateAuditHash(data) {
  const str = JSON.stringify(data) + Date.now().toString();
  return crypto.createHash('sha256').update(str).digest('hex');
}

// Simulate OCR extraction from an uploaded FDR document
// In production, this would use a real OCR service like Google Vision or AWS Textract
function simulateOCR(fileName, formData, testCase) {
  const confidence = 0.85 + Math.random() * 0.12;
  
  if (testCase === 'VALID') {
    return {
      extractedAmount: formData.depositAmount,
      extractedFdrNumber: formData.fdrNumber,
      extractedBank: formData.issuingBank,
      extractedMaturityDate: formData.maturityDate,
      extractedIssueDate: formData.issueDate,
      hasJointAccountClause: true,
      hasAicteLienClause: true,
      ocrConfidenceScore: parseFloat((confidence).toFixed(2))
    };
  }
  
  if (testCase === 'AMOUNT_MISMATCH') {
    return {
      extractedAmount: formData.depositAmount / 10,
      extractedFdrNumber: formData.fdrNumber,
      extractedBank: formData.issuingBank,
      extractedMaturityDate: formData.maturityDate,
      extractedIssueDate: formData.issueDate,
      hasJointAccountClause: true,
      hasAicteLienClause: true,
      ocrConfidenceScore: parseFloat((confidence).toFixed(2))
    };
  }
  
  if (testCase === 'MISSING_LIEN') {
    return {
      extractedAmount: formData.depositAmount,
      extractedFdrNumber: formData.fdrNumber,
      extractedBank: formData.issuingBank,
      extractedMaturityDate: formData.maturityDate,
      extractedIssueDate: formData.issueDate,
      hasJointAccountClause: false,
      hasAicteLienClause: false,
      ocrConfidenceScore: parseFloat((confidence).toFixed(2))
    };
  }
  
  // Default / normal OCR
  return {
    extractedAmount: formData.depositAmount,
    extractedFdrNumber: formData.fdrNumber,
    extractedBank: formData.issuingBank,
    extractedMaturityDate: formData.maturityDate,
    extractedIssueDate: formData.issueDate,
    hasJointAccountClause: formData.lienMarkedToAicte || false,
    hasAicteLienClause: formData.lienMarkedToAicte || false,
    ocrConfidenceScore: parseFloat((confidence).toFixed(2))
  };
}

// Create an audit log entry
async function createAuditLog({ action, module, fdrNumber, performedBy, userRole, ipAddress, previousState, newState }) {
  const logData = { action, module, fdrNumber, performedBy, userRole, timestamp: new Date(), ipAddress: ipAddress || '0.0.0.0' };
  const recordHash = generateAuditHash(logData);
  
  await AuditLog.create({
    ...logData,
    previousState,
    newState,
    recordHash
  });
}

// Generate a unique NOC reference number
function generateNOCReference() {
  const year = new Date().getFullYear();
  const random = Math.floor(100000 + Math.random() * 900000);
  return `AICTE/NOC/FDR/${year}/${random}`;
}

// Generate encashment order number
function generateEncashmentOrderNo() {
  const year = new Date().getFullYear();
  const random = Math.floor(10000 + Math.random() * 90000);
  return `AICTE/ENC/${year}/${random}`;
}

module.exports = {
  generateSHA256,
  generateAuditHash,
  simulateOCR,
  createAuditLog,
  generateNOCReference,
  generateEncashmentOrderNo
};
