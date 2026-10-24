const express = require('express');
const multer = require('multer');
const FDRRecord = require('../models/FDRRecord');
const MockBankRegistry = require('../models/MockBankRegistry');
const NotificationAlert = require('../models/NotificationAlert');
const { auth, authorize } = require('../middleware/auth');
const { generateSHA256, simulateOCR, createAuditLog, generateNOCReference, generateEncashmentOrderNo } = require('../utils/helpers');
const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

// ============================================================
// MODULE 1: FDR Submission with OCR Auto-Verification
// ============================================================

// Submit new FDR
router.post('/submit', auth, upload.single('document'), async (req, res) => {
  try {
    const {
      fdrNumber, institutionName, aictePermanentId, courseCategory,
      issuingBank, branchIfsc, depositAmount, issueDate, maturityDate,
      lockInYears, jointHolderName, lienMarkedToAicte, testCase
    } = req.body;

    const institutionId = req.user.institutionId || req.body.institutionId || 'INST-DEFAULT';

    // Check for duplicate FDR number
    const existingFdr = await FDRRecord.findOne({ fdrNumber, status: { $nin: ['FORFEITED_ENCASHED'] } });
    if (existingFdr) {
      return res.status(400).json({
        error: 'CRITICAL: Duplicate FDR Number detected!',
        alert: 'DUPLICATE_FDR_NUMBER',
        existingRecord: {
          institutionName: existingFdr.institutionName,
          status: existingFdr.status,
          depositAmount: existingFdr.depositAmount
        }
      });
    }

    // Generate SHA-256 hash
    let fileSha256Hash = null;
    let fileBase64 = null;
    let fileName = null;
    
    if (req.file) {
      fileSha256Hash = generateSHA256(req.file.buffer);
      fileName = req.file.originalname;
      // Store lightweight Base64 preview (limit to 500KB for demo)
      if (req.file.buffer.length < 500000) {
        fileBase64 = req.file.buffer.toString('base64');
      }

      // Check for duplicate file hash
      const duplicateHash = await FDRRecord.findOne({ fileSha256Hash });
      if (duplicateHash) {
        return res.status(400).json({
          error: 'CRITICAL: Duplicate Document / File Reuse Detected!',
          alert: 'DUPLICATE_FILE_HASH',
          detail: `This exact document file (SHA-256: ${fileSha256Hash.substring(0, 16)}...) was already uploaded by ${duplicateHash.institutionName} for FDR ${duplicateHash.fdrNumber}`,
          existingRecord: {
            fdrNumber: duplicateHash.fdrNumber,
            institutionName: duplicateHash.institutionName,
            sha256: fileSha256Hash
          }
        });
      }
    } else {
      // Generate hash from form data for demo
      fileSha256Hash = generateSHA256(Buffer.from(JSON.stringify({ fdrNumber, depositAmount, issueDate, issuingBank, ts: Date.now() })));
    }

    // Simulate OCR extraction
    const ocrExtractedData = simulateOCR(fileName, {
      depositAmount: parseFloat(depositAmount),
      fdrNumber,
      issuingBank,
      maturityDate,
      issueDate,
      lienMarkedToAicte: lienMarkedToAicte === 'true' || lienMarkedToAicte === true
    }, testCase);

    // Auto-detect discrepancies
    const discrepancyFlags = [];
    if (ocrExtractedData.extractedAmount !== parseFloat(depositAmount)) {
      discrepancyFlags.push('Amount Mismatch (OCR vs Submitted)');
    }
    if (!ocrExtractedData.hasAicteLienClause) {
      discrepancyFlags.push('Missing AICTE Lien Clause');
    }
    if (!ocrExtractedData.hasJointAccountClause) {
      discrepancyFlags.push('Missing Joint Account Clause');
    }

    const fdr = await FDRRecord.create({
      fdrNumber,
      institutionId,
      institutionName,
      aictePermanentId,
      courseCategory,
      issuingBank,
      branchIfsc,
      depositAmount: parseFloat(depositAmount),
      issueDate: new Date(issueDate),
      maturityDate: new Date(maturityDate),
      lockInYears: parseInt(lockInYears) || 3,
      jointHolderName,
      lienMarkedToAicte: lienMarkedToAicte === 'true' || lienMarkedToAicte === true,
      fileName,
      fileBase64,
      fileSha256Hash,
      ocrExtractedData,
      discrepancyFlags,
      status: discrepancyFlags.length > 0 ? 'DISCREPANCY_FLAGGED' : 'SUBMITTED'
    });

    // Create audit log
    await createAuditLog({
      action: 'FDR_SUBMITTED',
      module: 'FDR_SUBMISSION',
      fdrNumber,
      performedBy: req.user.name,
      userRole: req.user.role,
      ipAddress: req.ip,
      newState: { status: fdr.status, amount: fdr.depositAmount, discrepancies: discrepancyFlags }
    });

    // Create notification
    await NotificationAlert.create({
      recipientRole: 'SCRUTINY_OFFICER',
      institutionId,
      fdrNumber,
      alertType: 'SUBMISSION_RECEIVED',
      message: `New FDR ${fdrNumber} submitted by ${institutionName} for ₹${parseFloat(depositAmount).toLocaleString('en-IN')}${discrepancyFlags.length > 0 ? ' [DISCREPANCIES DETECTED]' : ''}`
    });

    res.status(201).json({
      fdr,
      ocrResults: ocrExtractedData,
      discrepancyFlags,
      sha256Hash: fileSha256Hash,
      message: discrepancyFlags.length > 0
        ? `FDR submitted with ${discrepancyFlags.length} discrepancy flag(s) detected`
        : 'FDR submitted successfully for scrutiny review'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all FDRs (with filters)
router.get('/', auth, async (req, res) => {
  try {
    const { status, institutionId, bank, search, maturityWindow } = req.query;
    const filter = {};

    // Role-based filtering
    if (req.user.role === 'INSTITUTION') {
      filter.institutionId = req.user.institutionId;
    }

    if (status) filter.status = status;
    if (institutionId) filter.institutionId = institutionId;
    if (bank) filter.issuingBank = { $regex: bank, $options: 'i' };
    if (search) {
      filter.$or = [
        { fdrNumber: { $regex: search, $options: 'i' } },
        { institutionName: { $regex: search, $options: 'i' } },
        { issuingBank: { $regex: search, $options: 'i' } }
      ];
    }

    // Maturity window filter
    if (maturityWindow) {
      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(now.getDate() + parseInt(maturityWindow));
      filter.maturityDate = { $gte: now, $lte: futureDate };
    }

    const fdrs = await FDRRecord.find(filter).sort({ createdAt: -1 });
    res.json(fdrs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single FDR
router.get('/:id', auth, async (req, res) => {
  try {
    const fdr = await FDRRecord.findById(req.params.id);
    if (!fdr) return res.status(404).json({ error: 'FDR not found' });
    res.json(fdr);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// MODULE 2: Scrutiny Officer Actions
// ============================================================

// Mark FDR under scrutiny
router.put('/:id/scrutiny', auth, authorize('SCRUTINY_OFFICER', 'DIRECTOR'), async (req, res) => {
  try {
    const fdr = await FDRRecord.findById(req.params.id);
    if (!fdr) return res.status(404).json({ error: 'FDR not found' });

    const previousState = { status: fdr.status };
    fdr.status = 'UNDER_SCRUTINY';
    await fdr.save();

    await createAuditLog({
      action: 'FDR_UNDER_SCRUTINY',
      module: 'SCRUTINY',
      fdrNumber: fdr.fdrNumber,
      performedBy: req.user.name,
      userRole: req.user.role,
      ipAddress: req.ip,
      previousState,
      newState: { status: 'UNDER_SCRUTINY' }
    });

    res.json({ message: 'FDR marked under scrutiny', fdr });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Flag discrepancy
router.put('/:id/flag-discrepancy', auth, authorize('SCRUTINY_OFFICER', 'DIRECTOR'), async (req, res) => {
  try {
    const { discrepancyFlags, scrutinyRemarks } = req.body;
    const fdr = await FDRRecord.findById(req.params.id);
    if (!fdr) return res.status(404).json({ error: 'FDR not found' });

    const previousState = { status: fdr.status, discrepancyFlags: fdr.discrepancyFlags };
    fdr.status = 'DISCREPANCY_FLAGGED';
    fdr.discrepancyFlags = [...new Set([...(fdr.discrepancyFlags || []), ...(discrepancyFlags || [])])];
    fdr.scrutinyRemarks = scrutinyRemarks || fdr.scrutinyRemarks;
    await fdr.save();

    await createAuditLog({
      action: 'DISCREPANCY_FLAGGED',
      module: 'SCRUTINY',
      fdrNumber: fdr.fdrNumber,
      performedBy: req.user.name,
      userRole: req.user.role,
      ipAddress: req.ip,
      previousState,
      newState: { status: 'DISCREPANCY_FLAGGED', discrepancyFlags: fdr.discrepancyFlags }
    });

    await NotificationAlert.create({
      recipientRole: 'INSTITUTION',
      institutionId: fdr.institutionId,
      fdrNumber: fdr.fdrNumber,
      alertType: 'DISCREPANCY',
      message: `Discrepancy flagged on FDR ${fdr.fdrNumber}: ${fdr.discrepancyFlags.join(', ')}`
    });

    res.json({ message: 'Discrepancy flagged', fdr });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Approve and mark active
router.put('/:id/approve', auth, authorize('SCRUTINY_OFFICER', 'DIRECTOR'), async (req, res) => {
  try {
    const fdr = await FDRRecord.findById(req.params.id);
    if (!fdr) return res.status(404).json({ error: 'FDR not found' });

    const previousState = { status: fdr.status };
    fdr.status = 'ACTIVE_VERIFIED';
    fdr.discrepancyFlags = [];
    fdr.scrutinyRemarks = req.body.remarks || 'Verified and approved by scrutiny officer';
    await fdr.save();

    await createAuditLog({
      action: 'FDR_APPROVED_ACTIVE',
      module: 'SCRUTINY',
      fdrNumber: fdr.fdrNumber,
      performedBy: req.user.name,
      userRole: req.user.role,
      ipAddress: req.ip,
      previousState,
      newState: { status: 'ACTIVE_VERIFIED' }
    });

    await NotificationAlert.create({
      recipientRole: 'INSTITUTION',
      institutionId: fdr.institutionId,
      fdrNumber: fdr.fdrNumber,
      alertType: 'BANK_VERIFIED',
      message: `FDR ${fdr.fdrNumber} has been verified and marked as Active by AICTE scrutiny`
    });

    res.json({ message: 'FDR approved and marked as Active Verified', fdr });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// MODULE 3: Bank Verification (Mock CBS)
// ============================================================

// Verify FDR against Mock CBS
router.post('/:id/verify-cbs', auth, async (req, res) => {
  try {
    const fdr = await FDRRecord.findById(req.params.id);
    if (!fdr) return res.status(404).json({ error: 'FDR not found' });

    // Query mock bank registry
    const bankRecord = await MockBankRegistry.findOne({ fdrNumber: fdr.fdrNumber });
    
    if (!bankRecord) {
      return res.json({
        verified: false,
        status: 'NOT_FOUND',
        message: `FDR ${fdr.fdrNumber} not found in Mock Bank CBS Registry. This may indicate a forged or non-existent instrument.`,
        bankData: null
      });
    }

    // Compare and generate verification result
    const mismatches = [];
    if (bankRecord.actualAmount !== fdr.depositAmount) {
      mismatches.push(`Amount: Submitted ₹${fdr.depositAmount.toLocaleString('en-IN')} vs Bank ₹${bankRecord.actualAmount.toLocaleString('en-IN')}`);
    }
    
    const bankMaturity = new Date(bankRecord.actualMaturityDate).toDateString();
    const fdrMaturity = new Date(fdr.maturityDate).toDateString();
    if (bankMaturity !== fdrMaturity) {
      mismatches.push(`Maturity Date: Submitted ${fdrMaturity} vs Bank ${bankMaturity}`);
    }
    
    if (!bankRecord.isLienMarked) {
      mismatches.push('Lien NOT marked to AICTE in bank records');
    }
    if (!bankRecord.isJointWithAicte) {
      mismatches.push('NOT jointly held with AICTE in bank records');
    }

    const verificationStatus = mismatches.length > 0 ? 'MISMATCH' : 'VERIFIED';

    // Update FDR with bank confirmed data
    fdr.bankVerificationStatus = verificationStatus;
    fdr.bankConfirmedData = {
      confirmedAmount: bankRecord.actualAmount,
      confirmedMaturityDate: bankRecord.actualMaturityDate,
      confirmedJointHolder: bankRecord.isJointWithAicte ? 'AICTE (Joint Holder)' : 'None',
      confirmedLienActive: bankRecord.isLienMarked,
      verifiedByBankOfficer: req.user.name,
      verifiedAt: new Date(),
      bankRemarks: mismatches.length > 0 ? `Mismatches found: ${mismatches.join('; ')}` : 'All details verified and match bank records'
    };

    if (mismatches.length > 0) {
      fdr.discrepancyFlags = [...new Set([...(fdr.discrepancyFlags || []), ...mismatches.map(m => m.split(':')[0] + ' Mismatch')])];
    }

    await fdr.save();

    await createAuditLog({
      action: 'CBS_VERIFICATION',
      module: 'BANK_VERIFICATION',
      fdrNumber: fdr.fdrNumber,
      performedBy: req.user.name,
      userRole: req.user.role,
      ipAddress: req.ip,
      newState: { bankVerificationStatus: verificationStatus, mismatches }
    });

    res.json({
      verified: verificationStatus === 'VERIFIED',
      status: verificationStatus,
      bankData: {
        fdrNumber: bankRecord.fdrNumber,
        bankName: bankRecord.bankName,
        ifsc: bankRecord.ifsc,
        actualAmount: bankRecord.actualAmount,
        actualIssueDate: bankRecord.actualIssueDate,
        actualMaturityDate: bankRecord.actualMaturityDate,
        isJointWithAicte: bankRecord.isJointWithAicte,
        isLienMarked: bankRecord.isLienMarked,
        accountStatus: bankRecord.accountStatus
      },
      mismatches,
      message: verificationStatus === 'VERIFIED'
        ? 'FDR successfully verified against Bank CBS. All details match.'
        : `CBS Verification found ${mismatches.length} mismatch(es)`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bank officer manual verification
router.put('/:id/bank-verify', auth, authorize('BANK_OFFICER'), async (req, res) => {
  try {
    const { confirmedAmount, confirmedMaturityDate, confirmedJointHolder, confirmedLienActive, bankRemarks, verificationStatus } = req.body;
    const fdr = await FDRRecord.findById(req.params.id);
    if (!fdr) return res.status(404).json({ error: 'FDR not found' });

    const previousState = { bankVerificationStatus: fdr.bankVerificationStatus };

    fdr.bankVerificationStatus = verificationStatus || 'VERIFIED';
    fdr.bankConfirmedData = {
      confirmedAmount: confirmedAmount || fdr.depositAmount,
      confirmedMaturityDate: confirmedMaturityDate || fdr.maturityDate,
      confirmedJointHolder: confirmedJointHolder || '',
      confirmedLienActive: confirmedLienActive !== undefined ? confirmedLienActive : fdr.lienMarkedToAicte,
      verifiedByBankOfficer: req.user.name,
      verifiedAt: new Date(),
      bankRemarks: bankRemarks || ''
    };
    await fdr.save();

    await createAuditLog({
      action: 'BANK_MANUAL_VERIFICATION',
      module: 'BANK_VERIFICATION',
      fdrNumber: fdr.fdrNumber,
      performedBy: req.user.name,
      userRole: req.user.role,
      ipAddress: req.ip,
      previousState,
      newState: { bankVerificationStatus: fdr.bankVerificationStatus }
    });

    res.json({ message: 'Bank verification updated', fdr });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// MODULE 4: Renewal & Replacement
// ============================================================

router.post('/:id/renew', auth, upload.single('document'), async (req, res) => {
  try {
    const oldFdr = await FDRRecord.findById(req.params.id);
    if (!oldFdr) return res.status(404).json({ error: 'Original FDR not found' });

    const {
      fdrNumber, issuingBank, branchIfsc, depositAmount,
      issueDate, maturityDate, lockInYears, jointHolderName,
      lienMarkedToAicte, testCase
    } = req.body;

    // Check for duplicate new FDR number
    const existingNew = await FDRRecord.findOne({ fdrNumber, status: { $nin: ['FORFEITED_ENCASHED', 'RENEWED'] } });
    if (existingNew) {
      return res.status(400).json({ error: 'New FDR number already exists in the system' });
    }

    // Generate hash for new document
    let fileSha256Hash = null;
    let fileBase64 = null;
    let fileName = null;
    
    if (req.file) {
      fileSha256Hash = generateSHA256(req.file.buffer);
      fileName = req.file.originalname;
      if (req.file.buffer.length < 500000) {
        fileBase64 = req.file.buffer.toString('base64');
      }
    } else {
      fileSha256Hash = generateSHA256(Buffer.from(JSON.stringify({ fdrNumber, depositAmount, issueDate, ts: Date.now() })));
    }

    // OCR simulation for new document
    const ocrExtractedData = simulateOCR(fileName, {
      depositAmount: parseFloat(depositAmount),
      fdrNumber,
      issuingBank: issuingBank || oldFdr.issuingBank,
      maturityDate,
      issueDate,
      lienMarkedToAicte: lienMarkedToAicte === 'true' || lienMarkedToAicte === true
    }, testCase);

    // Archive old FDR details
    const renewalHistoryEntry = {
      version: oldFdr.version,
      fdrNumber: oldFdr.fdrNumber,
      issueDate: oldFdr.issueDate,
      maturityDate: oldFdr.maturityDate,
      amount: oldFdr.depositAmount,
      archivedAt: new Date()
    };

    // Create new FDR record (renewal)
    const newFdr = await FDRRecord.create({
      fdrNumber,
      institutionId: oldFdr.institutionId,
      institutionName: oldFdr.institutionName,
      aictePermanentId: oldFdr.aictePermanentId,
      courseCategory: oldFdr.courseCategory,
      issuingBank: issuingBank || oldFdr.issuingBank,
      branchIfsc: branchIfsc || oldFdr.branchIfsc,
      depositAmount: parseFloat(depositAmount),
      issueDate: new Date(issueDate),
      maturityDate: new Date(maturityDate),
      lockInYears: parseInt(lockInYears) || 3,
      jointHolderName: jointHolderName || oldFdr.jointHolderName,
      lienMarkedToAicte: lienMarkedToAicte === 'true' || lienMarkedToAicte === true,
      fileName,
      fileBase64,
      fileSha256Hash,
      ocrExtractedData,
      status: 'SUBMITTED',
      version: oldFdr.version + 1,
      parentFdrId: oldFdr._id,
      renewalHistory: [...(oldFdr.renewalHistory || []), renewalHistoryEntry]
    });

    // Mark old FDR as renewed
    oldFdr.status = 'RENEWED';
    await oldFdr.save();

    await createAuditLog({
      action: 'FDR_RENEWED',
      module: 'RENEWAL',
      fdrNumber: oldFdr.fdrNumber,
      performedBy: req.user.name,
      userRole: req.user.role,
      ipAddress: req.ip,
      previousState: { oldFdrNumber: oldFdr.fdrNumber, oldVersion: oldFdr.version },
      newState: { newFdrNumber: fdrNumber, newVersion: newFdr.version }
    });

    await NotificationAlert.create({
      recipientRole: 'SCRUTINY_OFFICER',
      institutionId: oldFdr.institutionId,
      fdrNumber: fdrNumber,
      alertType: 'RENEWAL_SUBMITTED',
      message: `Renewal FDR ${fdrNumber} (v${newFdr.version}) submitted for ${oldFdr.institutionName}, replacing ${oldFdr.fdrNumber} (v${oldFdr.version})`
    });

    res.status(201).json({
      message: 'Renewal FDR submitted successfully',
      newFdr,
      previousVersion: renewalHistoryEntry,
      ocrResults: ocrExtractedData
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// MODULE 5: Release / Refund Workflow
// ============================================================

// Request release
router.post('/:id/request-release', auth, async (req, res) => {
  try {
    const { reason } = req.body;
    const fdr = await FDRRecord.findById(req.params.id);
    if (!fdr) return res.status(404).json({ error: 'FDR not found' });

    const previousState = { status: fdr.status };
    fdr.status = 'RELEASE_REQUESTED';
    fdr.releaseRequest = {
      requestedAt: new Date(),
      reason: reason || 'Lock-in period completed. Requesting FDR release/refund.',
      checklist: {
        lockInCompleted: false,
        noCourtCase: false,
        noFacultyDues: false,
        complianceVerified: false
      },
      scrutinyRecommendation: 'PENDING',
      directorApprovalStatus: 'PENDING'
    };
    await fdr.save();

    await createAuditLog({
      action: 'RELEASE_REQUESTED',
      module: 'RELEASE_REFUND',
      fdrNumber: fdr.fdrNumber,
      performedBy: req.user.name,
      userRole: req.user.role,
      ipAddress: req.ip,
      previousState,
      newState: { status: 'RELEASE_REQUESTED' }
    });

    await NotificationAlert.create({
      recipientRole: 'SCRUTINY_OFFICER',
      institutionId: fdr.institutionId,
      fdrNumber: fdr.fdrNumber,
      alertType: 'RELEASE_APPROVED',
      message: `Release/Refund request submitted for FDR ${fdr.fdrNumber} by ${fdr.institutionName}`
    });

    res.json({ message: 'Release request submitted', fdr });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Scrutiny officer checklist & recommendation
router.put('/:id/scrutiny-recommend', auth, authorize('SCRUTINY_OFFICER'), async (req, res) => {
  try {
    const { checklist, recommendation, remarks } = req.body;
    const fdr = await FDRRecord.findById(req.params.id);
    if (!fdr) return res.status(404).json({ error: 'FDR not found' });

    fdr.releaseRequest.checklist = checklist || fdr.releaseRequest.checklist;
    fdr.releaseRequest.scrutinyRecommendation = recommendation;
    fdr.scrutinyRemarks = remarks || fdr.scrutinyRemarks;
    await fdr.save();

    await createAuditLog({
      action: 'SCRUTINY_RECOMMENDATION',
      module: 'RELEASE_REFUND',
      fdrNumber: fdr.fdrNumber,
      performedBy: req.user.name,
      userRole: req.user.role,
      ipAddress: req.ip,
      newState: { recommendation, checklist }
    });

    res.json({ message: `Scrutiny recommendation: ${recommendation}`, fdr });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Director approval
router.put('/:id/director-approve', auth, authorize('DIRECTOR'), async (req, res) => {
  try {
    const { approved, remarks } = req.body;
    const fdr = await FDRRecord.findById(req.params.id);
    if (!fdr) return res.status(404).json({ error: 'FDR not found' });

    const previousState = { status: fdr.status, directorApprovalStatus: fdr.releaseRequest?.directorApprovalStatus };

    if (approved) {
      fdr.status = 'RELEASED_REFUNDED';
      fdr.releaseRequest.directorApprovalStatus = 'APPROVED';
      fdr.releaseRequest.nocReferenceNumber = generateNOCReference();
    } else {
      fdr.releaseRequest.directorApprovalStatus = 'REJECTED';
    }
    fdr.scrutinyRemarks = remarks || fdr.scrutinyRemarks;
    await fdr.save();

    await createAuditLog({
      action: approved ? 'RELEASE_APPROVED' : 'RELEASE_REJECTED',
      module: 'RELEASE_REFUND',
      fdrNumber: fdr.fdrNumber,
      performedBy: req.user.name,
      userRole: req.user.role,
      ipAddress: req.ip,
      previousState,
      newState: { status: fdr.status, nocReference: fdr.releaseRequest.nocReferenceNumber }
    });

    if (approved) {
      await NotificationAlert.create({
        recipientRole: 'INSTITUTION',
        institutionId: fdr.institutionId,
        fdrNumber: fdr.fdrNumber,
        alertType: 'RELEASE_APPROVED',
        message: `FDR ${fdr.fdrNumber} Release APPROVED. NOC Reference: ${fdr.releaseRequest.nocReferenceNumber}`
      });
    }

    res.json({
      message: approved ? 'Release approved. NOC generated.' : 'Release rejected.',
      fdr,
      nocReference: fdr.releaseRequest?.nocReferenceNumber
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// MODULE 5b: Forfeiture / Encashment
// ============================================================

router.put('/:id/forfeit', auth, authorize('DIRECTOR', 'SCRUTINY_OFFICER'), async (req, res) => {
  try {
    const { violationReason } = req.body;
    const fdr = await FDRRecord.findById(req.params.id);
    if (!fdr) return res.status(404).json({ error: 'FDR not found' });

    const previousState = { status: fdr.status };
    fdr.status = 'FORFEITED_ENCASHED';
    fdr.forfeitureDetails = {
      initiatedBy: req.user.name,
      violationReason: violationReason || 'Regulatory violation / Institutional default',
      encashmentOrderNo: generateEncashmentOrderNo(),
      forfeitedAt: new Date()
    };
    await fdr.save();

    await createAuditLog({
      action: 'FDR_FORFEITED',
      module: 'FORFEITURE',
      fdrNumber: fdr.fdrNumber,
      performedBy: req.user.name,
      userRole: req.user.role,
      ipAddress: req.ip,
      previousState,
      newState: { status: 'FORFEITED_ENCASHED', encashmentOrderNo: fdr.forfeitureDetails.encashmentOrderNo }
    });

    await NotificationAlert.create({
      recipientRole: 'INSTITUTION',
      institutionId: fdr.institutionId,
      fdrNumber: fdr.fdrNumber,
      alertType: 'FORFEITURE_NOTICE',
      message: `CRITICAL: FDR ${fdr.fdrNumber} has been FORFEITED. Encashment Order: ${fdr.forfeitureDetails.encashmentOrderNo}. Reason: ${violationReason}`
    });

    await NotificationAlert.create({
      recipientRole: 'BANK_OFFICER',
      fdrNumber: fdr.fdrNumber,
      alertType: 'FORFEITURE_NOTICE',
      message: `Bank Encashment Notice: FDR ${fdr.fdrNumber} at ${fdr.issuingBank} to be encashed per AICTE Order ${fdr.forfeitureDetails.encashmentOrderNo}`
    });

    res.json({
      message: 'FDR forfeited and encashment order generated',
      fdr,
      encashmentOrder: {
        orderNo: fdr.forfeitureDetails.encashmentOrderNo,
        fdrNumber: fdr.fdrNumber,
        bank: fdr.issuingBank,
        amount: fdr.depositAmount,
        institution: fdr.institutionName,
        reason: violationReason
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// MODULE 6: Dashboard & Analytics
// ============================================================

router.get('/analytics/dashboard', auth, async (req, res) => {
  try {
    const allFdrs = await FDRRecord.find();
    const now = new Date();

    const statusCounts = {};
    let totalCorpus = 0;
    const bankDistribution = {};
    const maturityTimeline = {};

    allFdrs.forEach(fdr => {
      // Status counts
      statusCounts[fdr.status] = (statusCounts[fdr.status] || 0) + 1;
      
      // Total corpus
      if (['ACTIVE_VERIFIED', 'EXPIRING_SOON', 'SUBMITTED', 'UNDER_SCRUTINY'].includes(fdr.status)) {
        totalCorpus += fdr.depositAmount;
      }

      // Bank distribution
      bankDistribution[fdr.issuingBank] = (bankDistribution[fdr.issuingBank] || 0) + 1;

      // Maturity timeline (next 12 months)
      const matDate = new Date(fdr.maturityDate);
      if (matDate > now) {
        const monthKey = `${matDate.getFullYear()}-${String(matDate.getMonth() + 1).padStart(2, '0')}`;
        maturityTimeline[monthKey] = (maturityTimeline[monthKey] || 0) + 1;
      }
    });

    // Expiring soon count (within 90 days)
    const expiringSoon = allFdrs.filter(fdr => {
      const daysToMaturity = Math.ceil((new Date(fdr.maturityDate) - now) / (1000 * 60 * 60 * 24));
      return daysToMaturity > 0 && daysToMaturity <= 90 && !['RELEASED_REFUNDED', 'FORFEITED_ENCASHED', 'RENEWED'].includes(fdr.status);
    }).length;

    // Overdue
    const overdue = allFdrs.filter(fdr => {
      return new Date(fdr.maturityDate) < now && !['RELEASED_REFUNDED', 'FORFEITED_ENCASHED', 'RENEWED', 'MATURED_OVERDUE'].includes(fdr.status);
    }).length;

    res.json({
      totalFdrs: allFdrs.length,
      totalCorpus,
      totalCorpusCrores: (totalCorpus / 10000000).toFixed(2),
      statusCounts,
      activeVerified: statusCounts['ACTIVE_VERIFIED'] || 0,
      expiringSoon,
      overdue,
      discrepancyFlagged: statusCounts['DISCREPANCY_FLAGGED'] || 0,
      releasedRefunded: statusCounts['RELEASED_REFUNDED'] || 0,
      forfeitedEncashed: statusCounts['FORFEITED_ENCASHED'] || 0,
      bankDistribution,
      maturityTimeline: Object.entries(maturityTimeline)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, count]) => ({ month, count }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CSV Export
router.get('/export/csv', auth, async (req, res) => {
  try {
    const fdrs = await FDRRecord.find().lean();
    const headers = ['FDR Number', 'Institution', 'Bank', 'Amount (₹)', 'Issue Date', 'Maturity Date', 'Status', 'Bank Verification', 'Discrepancies', 'Version'];
    const rows = fdrs.map(fdr => [
      fdr.fdrNumber,
      fdr.institutionName,
      fdr.issuingBank,
      fdr.depositAmount,
      new Date(fdr.issueDate).toLocaleDateString('en-IN'),
      new Date(fdr.maturityDate).toLocaleDateString('en-IN'),
      fdr.status,
      fdr.bankVerificationStatus,
      (fdr.discrepancyFlags || []).join('; '),
      fdr.version
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=fdr_records_export.csv');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
