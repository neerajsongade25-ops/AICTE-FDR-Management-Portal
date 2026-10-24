const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const FDRRecord = require('./models/FDRRecord');
const MockBankRegistry = require('./models/MockBankRegistry');
const NotificationAlert = require('./models/NotificationAlert');
const AuditLog = require('./models/AuditLog');
const { generateSHA256, generateNOCReference } = require('./utils/helpers');

async function seedDatabase() {
  try {
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      console.log('[SEED] Database already has data, skipping seed.');
      return;
    }

    console.log('[SEED] Seeding database with demo data...');

    // ============ USERS ============
    const password = await bcrypt.hash('demo123', 10);

    const users = await User.insertMany([
      {
        name: 'Dr. Rajesh Kumar',
        email: 'institution@demo.com',
        password,
        role: 'INSTITUTION',
        institutionId: 'INST-MH-001',
        institutionName: 'Maharashtra Institute of Technology, Pune',
        aictePermanentId: '1-4521789632'
      },
      {
        name: 'Smt. Priya Sharma',
        email: 'scrutiny@demo.com',
        password,
        role: 'SCRUTINY_OFFICER',
        institutionName: 'AICTE Regulation Bureau'
      },
      {
        name: 'Shri. Amit Verma',
        email: 'bank@demo.com',
        password,
        role: 'BANK_OFFICER',
        bankName: 'State Bank of India'
      },
      {
        name: 'Dr. Neelam Gupta',
        email: 'director@demo.com',
        password,
        role: 'DIRECTOR',
        institutionName: 'AICTE - Office of the Director'
      }
    ]);

    console.log('[SEED] Users created:', users.length);

    // ============ MOCK BANK REGISTRY (CBS) ============
    const now = new Date();
    const bankRecords = await MockBankRegistry.insertMany([
      {
        fdrNumber: 'FDR/SBI/2023/001247',
        bankName: 'State Bank of India',
        ifsc: 'SBIN0001234',
        actualAmount: 5000000,
        actualIssueDate: new Date('2023-03-15'),
        actualMaturityDate: new Date('2026-03-15'),
        isJointWithAicte: true,
        isLienMarked: true,
        accountStatus: 'ACTIVE',
        holderName: 'Dr. Rajesh Kumar',
        holderInstitution: 'Maharashtra Institute of Technology, Pune'
      },
      {
        fdrNumber: 'FDR/PNB/2023/005678',
        bankName: 'Punjab National Bank',
        ifsc: 'PUNB0123400',
        actualAmount: 3000000,
        actualIssueDate: new Date('2023-06-01'),
        actualMaturityDate: new Date('2026-06-01'),
        isJointWithAicte: true,
        isLienMarked: true,
        accountStatus: 'ACTIVE',
        holderName: 'Prof. Sunil Deshmukh',
        holderInstitution: 'Delhi Technical University'
      },
      {
        fdrNumber: 'FDR/CNB/2024/003456',
        bankName: 'Canara Bank',
        ifsc: 'CNRB0001234',
        actualAmount: 500000,  // Actual is 5L, institution will claim 50L
        actualIssueDate: new Date('2024-01-10'),
        actualMaturityDate: new Date('2027-01-10'),
        isJointWithAicte: true,
        isLienMarked: true,
        accountStatus: 'ACTIVE',
        holderName: 'Dr. Meera Patel',
        holderInstitution: 'Gujarat Engineering College'
      },
      {
        fdrNumber: 'FDR/BOB/2023/009012',
        bankName: 'Bank of Baroda',
        ifsc: 'BARB0VJMUMB',
        actualAmount: 4000000,
        actualIssueDate: new Date('2023-09-20'),
        actualMaturityDate: new Date('2026-09-20'),
        isJointWithAicte: false,  // Missing lien
        isLienMarked: false,      // Missing lien
        accountStatus: 'ACTIVE',
        holderName: 'Shri. Arun Joshi',
        holderInstitution: 'Rajasthan Institute of Engineering'
      },
      {
        fdrNumber: 'FDR/HDFC/2024/007890',
        bankName: 'HDFC Bank',
        ifsc: 'HDFC0001234',
        actualAmount: 7500000,
        actualIssueDate: new Date('2024-04-01'),
        actualMaturityDate: addDays(now, 14),
        isJointWithAicte: true,
        isLienMarked: true,
        accountStatus: 'ACTIVE',
        holderName: 'Prof. Kavita Reddy',
        holderInstitution: 'Hyderabad College of Engineering'
      },
      {
        fdrNumber: 'FDR/SBI/2024/002345',
        bankName: 'State Bank of India',
        ifsc: 'SBIN0005678',
        actualAmount: 6000000,
        actualIssueDate: new Date('2024-02-15'),
        actualMaturityDate: addDays(now, 28),
        isJointWithAicte: true,
        isLienMarked: true,
        accountStatus: 'ACTIVE',
        holderName: 'Dr. Anil Kapoor',
        holderInstitution: 'Bangalore Institute of Technology'
      },
      {
        fdrNumber: 'FDR/PNB/2022/001111',
        bankName: 'Punjab National Bank',
        ifsc: 'PUNB0654321',
        actualAmount: 2500000,
        actualIssueDate: new Date('2022-01-01'),
        actualMaturityDate: new Date('2025-01-01'),
        isJointWithAicte: true,
        isLienMarked: true,
        accountStatus: 'MATURED',
        holderName: 'Prof. Rakesh Singh',
        holderInstitution: 'Chennai Engineering Academy'
      },
      {
        fdrNumber: 'FDR/PNB/2025/002222',
        bankName: 'Punjab National Bank',
        ifsc: 'PUNB0654321',
        actualAmount: 3000000,
        actualIssueDate: new Date('2025-01-15'),
        actualMaturityDate: new Date('2028-01-15'),
        isJointWithAicte: true,
        isLienMarked: true,
        accountStatus: 'ACTIVE',
        holderName: 'Prof. Rakesh Singh',
        holderInstitution: 'Chennai Engineering Academy'
      },
      {
        fdrNumber: 'FDR/CNB/2023/004444',
        bankName: 'Canara Bank',
        ifsc: 'CNRB0005678',
        actualAmount: 5500000,
        actualIssueDate: new Date('2023-07-01'),
        actualMaturityDate: new Date('2026-07-01'),
        isJointWithAicte: true,
        isLienMarked: true,
        accountStatus: 'ACTIVE',
        holderName: 'Dr. Priya Nair',
        holderInstitution: 'Kerala Polytechnic Institute'
      }
    ]);

    console.log('[SEED] Bank CBS records created:', bankRecords.length);

    // ============ FDR RECORDS ============
    const fdrs = [];

    // 1. ACTIVE_VERIFIED - SBI
    fdrs.push({
      fdrNumber: 'FDR/SBI/2023/001247',
      institutionId: 'INST-MH-001',
      institutionName: 'Maharashtra Institute of Technology, Pune',
      aictePermanentId: '1-4521789632',
      courseCategory: 'ENGINEERING',
      issuingBank: 'State Bank of India',
      branchIfsc: 'SBIN0001234',
      depositAmount: 5000000,
      issueDate: new Date('2023-03-15'),
      maturityDate: new Date('2026-03-15'),
      lockInYears: 3,
      jointHolderName: 'AICTE (Joint Holder)',
      lienMarkedToAicte: true,
      fileSha256Hash: generateSHA256(Buffer.from('FDR-SBI-001247-VALID')),
      ocrExtractedData: {
        extractedAmount: 5000000,
        extractedFdrNumber: 'FDR/SBI/2023/001247',
        extractedBank: 'State Bank of India',
        extractedMaturityDate: new Date('2026-03-15'),
        extractedIssueDate: new Date('2023-03-15'),
        hasJointAccountClause: true,
        hasAicteLienClause: true,
        ocrConfidenceScore: 0.94
      },
      bankVerificationStatus: 'VERIFIED',
      bankConfirmedData: {
        confirmedAmount: 5000000,
        confirmedMaturityDate: new Date('2026-03-15'),
        confirmedJointHolder: 'AICTE (Joint Holder)',
        confirmedLienActive: true,
        verifiedByBankOfficer: 'Shri. Amit Verma',
        verifiedAt: new Date('2023-04-01'),
        bankRemarks: 'All details verified and match bank records'
      },
      status: 'ACTIVE_VERIFIED',
      discrepancyFlags: [],
      scrutinyRemarks: 'Verified and approved. All regulatory clauses present.',
      version: 1
    });

    // 2. ACTIVE_VERIFIED - PNB
    fdrs.push({
      fdrNumber: 'FDR/PNB/2023/005678',
      institutionId: 'INST-DL-002',
      institutionName: 'Delhi Technical University',
      aictePermanentId: '1-7845123690',
      courseCategory: 'ENGINEERING',
      issuingBank: 'Punjab National Bank',
      branchIfsc: 'PUNB0123400',
      depositAmount: 3000000,
      issueDate: new Date('2023-06-01'),
      maturityDate: new Date('2026-06-01'),
      lockInYears: 3,
      jointHolderName: 'AICTE (Joint Holder)',
      lienMarkedToAicte: true,
      fileSha256Hash: generateSHA256(Buffer.from('FDR-PNB-005678-VALID')),
      ocrExtractedData: {
        extractedAmount: 3000000,
        extractedFdrNumber: 'FDR/PNB/2023/005678',
        extractedBank: 'Punjab National Bank',
        extractedMaturityDate: new Date('2026-06-01'),
        extractedIssueDate: new Date('2023-06-01'),
        hasJointAccountClause: true,
        hasAicteLienClause: true,
        ocrConfidenceScore: 0.91
      },
      bankVerificationStatus: 'VERIFIED',
      bankConfirmedData: {
        confirmedAmount: 3000000,
        confirmedMaturityDate: new Date('2026-06-01'),
        confirmedJointHolder: 'AICTE (Joint Holder)',
        confirmedLienActive: true,
        verifiedByBankOfficer: 'Shri. Amit Verma',
        verifiedAt: new Date('2023-07-01'),
        bankRemarks: 'All details verified and match bank records'
      },
      status: 'ACTIVE_VERIFIED',
      discrepancyFlags: [],
      scrutinyRemarks: 'Verified and approved.',
      version: 1
    });

    // 3. DISCREPANCY_FLAGGED - Amount Mismatch (Canara Bank)
    fdrs.push({
      fdrNumber: 'FDR/CNB/2024/003456',
      institutionId: 'INST-GJ-003',
      institutionName: 'Gujarat Engineering College',
      aictePermanentId: '1-3214567890',
      courseCategory: 'ENGINEERING',
      issuingBank: 'Canara Bank',
      branchIfsc: 'CNRB0001234',
      depositAmount: 5000000,  // Claims 50 Lakh
      issueDate: new Date('2024-01-10'),
      maturityDate: new Date('2027-01-10'),
      lockInYears: 3,
      jointHolderName: 'AICTE (Joint Holder)',
      lienMarkedToAicte: true,
      fileSha256Hash: generateSHA256(Buffer.from('FDR-CNB-003456-TAMPERED')),
      ocrExtractedData: {
        extractedAmount: 500000,  // OCR reads 5 Lakh
        extractedFdrNumber: 'FDR/CNB/2024/003456',
        extractedBank: 'Canara Bank',
        extractedMaturityDate: new Date('2027-01-10'),
        extractedIssueDate: new Date('2024-01-10'),
        hasJointAccountClause: true,
        hasAicteLienClause: true,
        ocrConfidenceScore: 0.88
      },
      bankVerificationStatus: 'MISMATCH',
      bankConfirmedData: {
        confirmedAmount: 500000,  // Bank confirms 5 Lakh
        confirmedMaturityDate: new Date('2027-01-10'),
        confirmedJointHolder: 'AICTE (Joint Holder)',
        confirmedLienActive: true,
        verifiedByBankOfficer: 'Shri. Amit Verma',
        verifiedAt: new Date('2024-02-15'),
        bankRemarks: 'CRITICAL MISMATCH: Institution claims ₹50,00,000 but actual FDR amount is ₹5,00,000. Possible tampering detected.'
      },
      status: 'DISCREPANCY_FLAGGED',
      discrepancyFlags: ['Amount Mismatch (OCR vs Submitted)', 'Amount Mismatch: Submitted ₹50,00,000 vs Bank ₹5,00,000'],
      scrutinyRemarks: 'CRITICAL: 10x amount discrepancy detected. Institution submitted ₹50L but bank confirms only ₹5L. Flagged for investigation.',
      version: 1
    });

    // 4. DISCREPANCY_FLAGGED - Missing AICTE Lien (Bank of Baroda)
    fdrs.push({
      fdrNumber: 'FDR/BOB/2023/009012',
      institutionId: 'INST-RJ-004',
      institutionName: 'Rajasthan Institute of Engineering',
      aictePermanentId: '1-6547893210',
      courseCategory: 'ENGINEERING',
      issuingBank: 'Bank of Baroda',
      branchIfsc: 'BARB0VJMUMB',
      depositAmount: 4000000,
      issueDate: new Date('2023-09-20'),
      maturityDate: new Date('2026-09-20'),
      lockInYears: 3,
      jointHolderName: '',
      lienMarkedToAicte: false,
      fileSha256Hash: generateSHA256(Buffer.from('FDR-BOB-009012-NOLIEN')),
      ocrExtractedData: {
        extractedAmount: 4000000,
        extractedFdrNumber: 'FDR/BOB/2023/009012',
        extractedBank: 'Bank of Baroda',
        extractedMaturityDate: new Date('2026-09-20'),
        extractedIssueDate: new Date('2023-09-20'),
        hasJointAccountClause: false,
        hasAicteLienClause: false,
        ocrConfidenceScore: 0.92
      },
      bankVerificationStatus: 'MISMATCH',
      bankConfirmedData: {
        confirmedAmount: 4000000,
        confirmedMaturityDate: new Date('2026-09-20'),
        confirmedJointHolder: 'None',
        confirmedLienActive: false,
        verifiedByBankOfficer: 'Shri. Amit Verma',
        verifiedAt: new Date('2023-10-15'),
        bankRemarks: 'FDR is NOT jointly held with AICTE. Lien is NOT marked in favor of AICTE.'
      },
      status: 'DISCREPANCY_FLAGGED',
      discrepancyFlags: ['Missing AICTE Lien Clause', 'Missing Joint Account Clause', 'Lien NOT marked to AICTE in bank records'],
      scrutinyRemarks: 'Non-compliant FDR: Missing mandatory AICTE joint holding and lien marking. Institution must rectify with bank.',
      version: 1
    });

    // 5. EXPIRING_SOON - 14 days (HDFC)
    fdrs.push({
      fdrNumber: 'FDR/HDFC/2024/007890',
      institutionId: 'INST-TS-005',
      institutionName: 'Hyderabad College of Engineering',
      aictePermanentId: '1-1122334455',
      courseCategory: 'ENGINEERING',
      issuingBank: 'HDFC Bank',
      branchIfsc: 'HDFC0001234',
      depositAmount: 7500000,
      issueDate: new Date('2024-04-01'),
      maturityDate: addDays(now, 14),
      lockInYears: 3,
      jointHolderName: 'AICTE (Joint Holder)',
      lienMarkedToAicte: true,
      fileSha256Hash: generateSHA256(Buffer.from('FDR-HDFC-007890-EXPIRING')),
      ocrExtractedData: {
        extractedAmount: 7500000,
        extractedFdrNumber: 'FDR/HDFC/2024/007890',
        extractedBank: 'HDFC Bank',
        extractedMaturityDate: addDays(now, 14),
        extractedIssueDate: new Date('2024-04-01'),
        hasJointAccountClause: true,
        hasAicteLienClause: true,
        ocrConfidenceScore: 0.96
      },
      bankVerificationStatus: 'VERIFIED',
      bankConfirmedData: {
        confirmedAmount: 7500000,
        confirmedMaturityDate: addDays(now, 14),
        confirmedJointHolder: 'AICTE (Joint Holder)',
        confirmedLienActive: true,
        verifiedByBankOfficer: 'Shri. Amit Verma',
        verifiedAt: new Date('2024-05-01'),
        bankRemarks: 'All details verified'
      },
      status: 'EXPIRING_SOON',
      discrepancyFlags: [],
      version: 1
    });

    // 6. EXPIRING_SOON - 28 days (SBI)
    fdrs.push({
      fdrNumber: 'FDR/SBI/2024/002345',
      institutionId: 'INST-KA-006',
      institutionName: 'Bangalore Institute of Technology',
      aictePermanentId: '1-9988776655',
      courseCategory: 'ENGINEERING',
      issuingBank: 'State Bank of India',
      branchIfsc: 'SBIN0005678',
      depositAmount: 6000000,
      issueDate: new Date('2024-02-15'),
      maturityDate: addDays(now, 28),
      lockInYears: 3,
      jointHolderName: 'AICTE (Joint Holder)',
      lienMarkedToAicte: true,
      fileSha256Hash: generateSHA256(Buffer.from('FDR-SBI-002345-EXPIRING')),
      ocrExtractedData: {
        extractedAmount: 6000000,
        extractedFdrNumber: 'FDR/SBI/2024/002345',
        extractedBank: 'State Bank of India',
        extractedMaturityDate: addDays(now, 28),
        extractedIssueDate: new Date('2024-02-15'),
        hasJointAccountClause: true,
        hasAicteLienClause: true,
        ocrConfidenceScore: 0.93
      },
      bankVerificationStatus: 'VERIFIED',
      bankConfirmedData: {
        confirmedAmount: 6000000,
        confirmedMaturityDate: addDays(now, 28),
        confirmedJointHolder: 'AICTE (Joint Holder)',
        confirmedLienActive: true,
        verifiedByBankOfficer: 'Shri. Amit Verma',
        verifiedAt: new Date('2024-03-15'),
        bankRemarks: 'All details verified'
      },
      status: 'EXPIRING_SOON',
      discrepancyFlags: [],
      version: 1
    });

    // 7. RENEWED (v2) with history chain (PNB - Chennai)
    const oldFdr = {
      fdrNumber: 'FDR/PNB/2022/001111',
      institutionId: 'INST-TN-007',
      institutionName: 'Chennai Engineering Academy',
      aictePermanentId: '1-5566778899',
      courseCategory: 'ENGINEERING',
      issuingBank: 'Punjab National Bank',
      branchIfsc: 'PUNB0654321',
      depositAmount: 2500000,
      issueDate: new Date('2022-01-01'),
      maturityDate: new Date('2025-01-01'),
      lockInYears: 3,
      jointHolderName: 'AICTE (Joint Holder)',
      lienMarkedToAicte: true,
      fileSha256Hash: generateSHA256(Buffer.from('FDR-PNB-001111-OLD')),
      ocrExtractedData: {
        extractedAmount: 2500000,
        extractedFdrNumber: 'FDR/PNB/2022/001111',
        extractedBank: 'Punjab National Bank',
        extractedMaturityDate: new Date('2025-01-01'),
        extractedIssueDate: new Date('2022-01-01'),
        hasJointAccountClause: true,
        hasAicteLienClause: true,
        ocrConfidenceScore: 0.90
      },
      bankVerificationStatus: 'VERIFIED',
      status: 'RENEWED',
      version: 1
    };
    
    const createdOldFdr = await FDRRecord.create(oldFdr);

    fdrs.push({
      fdrNumber: 'FDR/PNB/2025/002222',
      institutionId: 'INST-TN-007',
      institutionName: 'Chennai Engineering Academy',
      aictePermanentId: '1-5566778899',
      courseCategory: 'ENGINEERING',
      issuingBank: 'Punjab National Bank',
      branchIfsc: 'PUNB0654321',
      depositAmount: 3000000,
      issueDate: new Date('2025-01-15'),
      maturityDate: new Date('2028-01-15'),
      lockInYears: 3,
      jointHolderName: 'AICTE (Joint Holder)',
      lienMarkedToAicte: true,
      fileSha256Hash: generateSHA256(Buffer.from('FDR-PNB-002222-RENEWED')),
      ocrExtractedData: {
        extractedAmount: 3000000,
        extractedFdrNumber: 'FDR/PNB/2025/002222',
        extractedBank: 'Punjab National Bank',
        extractedMaturityDate: new Date('2028-01-15'),
        extractedIssueDate: new Date('2025-01-15'),
        hasJointAccountClause: true,
        hasAicteLienClause: true,
        ocrConfidenceScore: 0.95
      },
      bankVerificationStatus: 'VERIFIED',
      bankConfirmedData: {
        confirmedAmount: 3000000,
        confirmedMaturityDate: new Date('2028-01-15'),
        confirmedJointHolder: 'AICTE (Joint Holder)',
        confirmedLienActive: true,
        verifiedByBankOfficer: 'Shri. Amit Verma',
        verifiedAt: new Date('2025-02-01'),
        bankRemarks: 'Renewed FDR verified'
      },
      status: 'ACTIVE_VERIFIED',
      version: 2,
      parentFdrId: createdOldFdr._id,
      renewalHistory: [{
        version: 1,
        fdrNumber: 'FDR/PNB/2022/001111',
        issueDate: new Date('2022-01-01'),
        maturityDate: new Date('2025-01-01'),
        amount: 2500000,
        archivedAt: new Date('2025-01-15')
      }]
    });

    // 8. RELEASE_REQUESTED (Canara Bank - Kerala)
    fdrs.push({
      fdrNumber: 'FDR/CNB/2023/004444',
      institutionId: 'INST-KL-008',
      institutionName: 'Kerala Polytechnic Institute',
      aictePermanentId: '1-2233445566',
      courseCategory: 'POLYTECHNIC',
      issuingBank: 'Canara Bank',
      branchIfsc: 'CNRB0005678',
      depositAmount: 5500000,
      issueDate: new Date('2023-07-01'),
      maturityDate: new Date('2026-07-01'),
      lockInYears: 3,
      jointHolderName: 'AICTE (Joint Holder)',
      lienMarkedToAicte: true,
      fileSha256Hash: generateSHA256(Buffer.from('FDR-CNB-004444-RELEASE')),
      ocrExtractedData: {
        extractedAmount: 5500000,
        extractedFdrNumber: 'FDR/CNB/2023/004444',
        extractedBank: 'Canara Bank',
        extractedMaturityDate: new Date('2026-07-01'),
        extractedIssueDate: new Date('2023-07-01'),
        hasJointAccountClause: true,
        hasAicteLienClause: true,
        ocrConfidenceScore: 0.92
      },
      bankVerificationStatus: 'VERIFIED',
      bankConfirmedData: {
        confirmedAmount: 5500000,
        confirmedMaturityDate: new Date('2026-07-01'),
        confirmedJointHolder: 'AICTE (Joint Holder)',
        confirmedLienActive: true,
        verifiedByBankOfficer: 'Shri. Amit Verma',
        verifiedAt: new Date('2023-08-01'),
        bankRemarks: 'All details verified'
      },
      status: 'RELEASE_REQUESTED',
      discrepancyFlags: [],
      releaseRequest: {
        requestedAt: new Date(),
        reason: 'Lock-in period completed. Institution closing approved program. Requesting FDR release and refund.',
        checklist: {
          lockInCompleted: true,
          noCourtCase: true,
          noFacultyDues: false,
          complianceVerified: false
        },
        scrutinyRecommendation: 'PENDING',
        directorApprovalStatus: 'PENDING'
      },
      version: 1
    });

    // Insert all FDRs
    await FDRRecord.insertMany(fdrs);
    console.log('[SEED] FDR Records created:', fdrs.length + 1); // +1 for old renewed FDR

    // ============ SAMPLE NOTIFICATIONS ============
    await NotificationAlert.insertMany([
      {
        recipientRole: 'SCRUTINY_OFFICER',
        fdrNumber: 'FDR/CNB/2024/003456',
        alertType: 'DISCREPANCY',
        message: 'CRITICAL: Amount mismatch detected on FDR/CNB/2024/003456. Institution claims ₹50,00,000 but OCR & Bank confirm ₹5,00,000.',
        isRead: false
      },
      {
        recipientRole: 'INSTITUTION',
        institutionId: 'INST-TS-005',
        fdrNumber: 'FDR/HDFC/2024/007890',
        alertType: 'EXPIRING_30_DAYS',
        message: 'WARNING: FDR/HDFC/2024/007890 expires in 14 days. Submit renewal immediately.',
        isRead: false
      },
      {
        recipientRole: 'DIRECTOR',
        fdrNumber: 'FDR/CNB/2023/004444',
        alertType: 'RELEASE_APPROVED',
        message: 'Release/Refund request pending for FDR/CNB/2023/004444 by Kerala Polytechnic Institute.',
        isRead: false
      },
      {
        recipientRole: 'SCRUTINY_OFFICER',
        fdrNumber: 'FDR/BOB/2023/009012',
        alertType: 'DISCREPANCY',
        message: 'FDR/BOB/2023/009012 from Rajasthan Institute of Engineering is missing AICTE Lien and Joint Account clauses.',
        isRead: false
      },
      {
        recipientRole: 'BANK_OFFICER',
        fdrNumber: 'FDR/SBI/2024/002345',
        alertType: 'SUBMISSION_RECEIVED',
        message: 'New FDR verification pending: FDR/SBI/2024/002345 from Bangalore Institute of Technology.',
        isRead: false
      }
    ]);

    // ============ SAMPLE AUDIT LOGS ============
    const { generateAuditHash } = require('./utils/helpers');
    await AuditLog.insertMany([
      {
        action: 'FDR_SUBMITTED',
        module: 'FDR_SUBMISSION',
        fdrNumber: 'FDR/SBI/2023/001247',
        performedBy: 'Dr. Rajesh Kumar',
        userRole: 'INSTITUTION',
        timestamp: new Date('2023-03-15'),
        ipAddress: '192.168.1.100',
        newState: { status: 'SUBMITTED', amount: 5000000 },
        recordHash: generateAuditHash({ action: 'FDR_SUBMITTED', fdrNumber: 'FDR/SBI/2023/001247' })
      },
      {
        action: 'CBS_VERIFICATION',
        module: 'BANK_VERIFICATION',
        fdrNumber: 'FDR/SBI/2023/001247',
        performedBy: 'Shri. Amit Verma',
        userRole: 'BANK_OFFICER',
        timestamp: new Date('2023-04-01'),
        ipAddress: '10.0.0.50',
        newState: { bankVerificationStatus: 'VERIFIED' },
        recordHash: generateAuditHash({ action: 'CBS_VERIFICATION', fdrNumber: 'FDR/SBI/2023/001247' })
      },
      {
        action: 'FDR_APPROVED_ACTIVE',
        module: 'SCRUTINY',
        fdrNumber: 'FDR/SBI/2023/001247',
        performedBy: 'Smt. Priya Sharma',
        userRole: 'SCRUTINY_OFFICER',
        timestamp: new Date('2023-04-05'),
        ipAddress: '10.0.0.25',
        previousState: { status: 'SUBMITTED' },
        newState: { status: 'ACTIVE_VERIFIED' },
        recordHash: generateAuditHash({ action: 'FDR_APPROVED_ACTIVE', fdrNumber: 'FDR/SBI/2023/001247' })
      },
      {
        action: 'DISCREPANCY_FLAGGED',
        module: 'SCRUTINY',
        fdrNumber: 'FDR/CNB/2024/003456',
        performedBy: 'Smt. Priya Sharma',
        userRole: 'SCRUTINY_OFFICER',
        timestamp: new Date('2024-02-20'),
        ipAddress: '10.0.0.25',
        newState: { status: 'DISCREPANCY_FLAGGED', discrepancies: ['Amount Mismatch'] },
        recordHash: generateAuditHash({ action: 'DISCREPANCY_FLAGGED', fdrNumber: 'FDR/CNB/2024/003456' })
      },
      {
        action: 'FDR_RENEWED',
        module: 'RENEWAL',
        fdrNumber: 'FDR/PNB/2022/001111',
        performedBy: 'Prof. Rakesh Singh',
        userRole: 'INSTITUTION',
        timestamp: new Date('2025-01-15'),
        ipAddress: '172.16.0.10',
        previousState: { oldFdrNumber: 'FDR/PNB/2022/001111', version: 1 },
        newState: { newFdrNumber: 'FDR/PNB/2025/002222', version: 2 },
        recordHash: generateAuditHash({ action: 'FDR_RENEWED', fdrNumber: 'FDR/PNB/2022/001111' })
      },
      {
        action: 'RELEASE_REQUESTED',
        module: 'RELEASE_REFUND',
        fdrNumber: 'FDR/CNB/2023/004444',
        performedBy: 'Dr. Priya Nair',
        userRole: 'INSTITUTION',
        timestamp: new Date(),
        ipAddress: '192.168.5.20',
        newState: { status: 'RELEASE_REQUESTED' },
        recordHash: generateAuditHash({ action: 'RELEASE_REQUESTED', fdrNumber: 'FDR/CNB/2023/004444' })
      }
    ]);

    console.log('[SEED] ✅ Database seeding complete!');
    console.log('[SEED] Demo credentials: All roles use password "demo123"');
    console.log('[SEED]   Institution: institution@demo.com');
    console.log('[SEED]   Scrutiny Officer: scrutiny@demo.com');
    console.log('[SEED]   Bank Officer: bank@demo.com');
    console.log('[SEED]   Director: director@demo.com');

  } catch (err) {
    console.error('[SEED] Error seeding database:', err);
  }
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

module.exports = seedDatabase;
