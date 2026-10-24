const express = require('express');
const MockBankRegistry = require('../models/MockBankRegistry');
const { auth, authorize } = require('../middleware/auth');
const { createAuditLog } = require('../utils/helpers');
const router = express.Router();

// Get all bank registry entries
router.get('/', auth, async (req, res) => {
  try {
    const { bankName, search } = req.query;
    const filter = {};
    if (bankName) filter.bankName = { $regex: bankName, $options: 'i' };
    if (search) {
      filter.$or = [
        { fdrNumber: { $regex: search, $options: 'i' } },
        { bankName: { $regex: search, $options: 'i' } },
        { holderInstitution: { $regex: search, $options: 'i' } }
      ];
    }
    const records = await MockBankRegistry.find(filter).sort({ createdAt: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add new CBS record
router.post('/', auth, authorize('BANK_OFFICER', 'DIRECTOR'), async (req, res) => {
  try {
    const record = await MockBankRegistry.create(req.body);
    
    await createAuditLog({
      action: 'CBS_RECORD_CREATED',
      module: 'BANK_CBS',
      fdrNumber: record.fdrNumber,
      performedBy: req.user.name,
      userRole: req.user.role,
      ipAddress: req.ip,
      newState: record.toObject()
    });

    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update CBS record
router.put('/:id', auth, authorize('BANK_OFFICER', 'DIRECTOR'), async (req, res) => {
  try {
    const record = await MockBankRegistry.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!record) return res.status(404).json({ error: 'CBS record not found' });

    await createAuditLog({
      action: 'CBS_RECORD_UPDATED',
      module: 'BANK_CBS',
      fdrNumber: record.fdrNumber,
      performedBy: req.user.name,
      userRole: req.user.role,
      ipAddress: req.ip,
      newState: record.toObject()
    });

    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete CBS record
router.delete('/:id', auth, authorize('BANK_OFFICER', 'DIRECTOR'), async (req, res) => {
  try {
    const record = await MockBankRegistry.findByIdAndDelete(req.params.id);
    if (!record) return res.status(404).json({ error: 'CBS record not found' });
    res.json({ message: 'CBS record deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
