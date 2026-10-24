const express = require('express');
const multer = require('multer');
const Papa = require('papaparse');
const FDRRecord = require('../models/FDRRecord');
const { auth, authorize } = require('../middleware/auth');
const { generateSHA256, createAuditLog } = require('../utils/helpers');
const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

// Download sample CSV template
router.get('/sample-csv', (req, res) => {
  const headers = 'fdrNumber,institutionName,institutionId,aictePermanentId,courseCategory,issuingBank,branchIfsc,depositAmount,issueDate,maturityDate,lockInYears,jointHolderName,lienMarkedToAicte';
  const sampleRows = [
    'FDR/SBI/2023/SAMPLE001,Sample Engineering College,INST-SAMPLE-01,1-23456789,ENGINEERING,State Bank of India,SBIN0001234,2500000,2023-01-15,2026-01-15,3,AICTE Joint Holder,true',
    'FDR/PNB/2023/SAMPLE002,Sample Polytechnic,INST-SAMPLE-02,1-98765432,POLYTECHNIC,Punjab National Bank,PUNB0567890,1500000,2023-06-01,2026-06-01,3,AICTE Joint Holder,true'
  ];
  
  const csv = [headers, ...sampleRows].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=sample_legacy_fdr_import.csv');
  res.send(csv);
});

// Preview bulk import (validate without saving)
router.post('/preview', auth, authorize('SCRUTINY_OFFICER', 'DIRECTOR'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const csvText = req.file.buffer.toString('utf-8');
    const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });

    if (parsed.errors.length > 0) {
      return res.status(400).json({ error: 'CSV parsing errors', details: parsed.errors });
    }

    const rows = parsed.data;
    const validationResults = [];
    const existingFdrNumbers = new Set();

    // Get all existing FDR numbers
    const existing = await FDRRecord.find({}, 'fdrNumber');
    existing.forEach(f => existingFdrNumbers.add(f.fdrNumber));

    const seenInFile = new Set();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const errors = [];

      // Validate required fields
      if (!row.fdrNumber) errors.push('Missing FDR Number');
      if (!row.institutionName) errors.push('Missing Institution Name');
      if (!row.issuingBank) errors.push('Missing Issuing Bank');
      if (!row.depositAmount || isNaN(parseFloat(row.depositAmount))) errors.push('Invalid Deposit Amount');
      if (!row.issueDate || isNaN(Date.parse(row.issueDate))) errors.push('Invalid Issue Date');
      if (!row.maturityDate || isNaN(Date.parse(row.maturityDate))) errors.push('Invalid Maturity Date');
      
      // Validate IFSC format
      if (row.branchIfsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(row.branchIfsc)) {
        errors.push('Invalid IFSC format');
      }

      // Check for duplicate FDR number in DB
      if (existingFdrNumbers.has(row.fdrNumber)) {
        errors.push('Duplicate FDR Number (exists in database)');
      }

      // Check for duplicate within file
      if (seenInFile.has(row.fdrNumber)) {
        errors.push('Duplicate FDR Number (within file)');
      }
      seenInFile.add(row.fdrNumber);

      // Check if already matured
      if (row.maturityDate && new Date(row.maturityDate) < new Date()) {
        errors.push('Already Matured');
      }

      validationResults.push({
        rowIndex: i + 1,
        data: row,
        valid: errors.length === 0,
        errors
      });
    }

    const validCount = validationResults.filter(r => r.valid).length;
    const invalidCount = validationResults.filter(r => !r.valid).length;

    res.json({
      totalRows: rows.length,
      validCount,
      invalidCount,
      rows: validationResults
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Execute bulk import
router.post('/execute', auth, authorize('SCRUTINY_OFFICER', 'DIRECTOR'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const csvText = req.file.buffer.toString('utf-8');
    const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
    const rows = parsed.data;

    const results = { imported: 0, skipped: 0, errors: [] };
    const existingFdrNumbers = new Set();
    const existing = await FDRRecord.find({}, 'fdrNumber');
    existing.forEach(f => existingFdrNumbers.add(f.fdrNumber));

    for (const row of rows) {
      try {
        if (!row.fdrNumber || !row.institutionName || !row.issuingBank || !row.depositAmount || !row.issueDate || !row.maturityDate) {
          results.skipped++;
          results.errors.push(`Row ${row.fdrNumber || 'unknown'}: Missing required fields`);
          continue;
        }

        if (existingFdrNumbers.has(row.fdrNumber)) {
          results.skipped++;
          results.errors.push(`Row ${row.fdrNumber}: Duplicate FDR number`);
          continue;
        }

        const fileSha256Hash = generateSHA256(Buffer.from(JSON.stringify(row)));

        await FDRRecord.create({
          fdrNumber: row.fdrNumber,
          institutionId: row.institutionId || 'LEGACY-IMPORT',
          institutionName: row.institutionName,
          aictePermanentId: row.aictePermanentId || '',
          courseCategory: row.courseCategory || 'ENGINEERING',
          issuingBank: row.issuingBank,
          branchIfsc: row.branchIfsc || '',
          depositAmount: parseFloat(row.depositAmount),
          issueDate: new Date(row.issueDate),
          maturityDate: new Date(row.maturityDate),
          lockInYears: parseInt(row.lockInYears) || 3,
          jointHolderName: row.jointHolderName || '',
          lienMarkedToAicte: row.lienMarkedToAicte === 'true',
          fileSha256Hash,
          status: new Date(row.maturityDate) < new Date() ? 'MATURED_OVERDUE' : 'ACTIVE_VERIFIED'
        });

        existingFdrNumbers.add(row.fdrNumber);
        results.imported++;
      } catch (err) {
        results.skipped++;
        results.errors.push(`Row ${row.fdrNumber || 'unknown'}: ${err.message}`);
      }
    }

    await createAuditLog({
      action: 'BULK_IMPORT',
      module: 'LEGACY_IMPORT',
      performedBy: req.user.name,
      userRole: req.user.role,
      ipAddress: req.ip,
      newState: { imported: results.imported, skipped: results.skipped }
    });

    res.json({
      message: `Bulk import complete: ${results.imported} imported, ${results.skipped} skipped`,
      ...results
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
