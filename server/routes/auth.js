const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, institutionId, institutionName, aictePermanentId, bankName } = req.body;
    
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name, email, password: hashedPassword, role,
      institutionId, institutionName, aictePermanentId, bankName
    });

    const token = jwt.sign(
      { id: user._id, name: user.name, email: user.email, role: user.role, institutionId: user.institutionId, institutionName: user.institutionName, aictePermanentId: user.aictePermanentId, bankName: user.bankName },
      process.env.JWT_SECRET || 'aicte_fdr_hackathon_secret_key_2024',
      { expiresIn: '24h' }
    );

    res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role, institutionId: user.institutionId, institutionName: user.institutionName } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user._id, name: user.name, email: user.email, role: user.role, institutionId: user.institutionId, institutionName: user.institutionName, aictePermanentId: user.aictePermanentId, bankName: user.bankName },
      process.env.JWT_SECRET || 'aicte_fdr_hackathon_secret_key_2024',
      { expiresIn: '24h' }
    );

    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role, institutionId: user.institutionId, institutionName: user.institutionName, bankName: user.bankName } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Quick switch role (Hackathon demo feature)
router.post('/switch-role', auth, async (req, res) => {
  try {
    const { role } = req.body;
    const validRoles = ['INSTITUTION', 'SCRUTINY_OFFICER', 'BANK_OFFICER', 'DIRECTOR'];
    if (!validRoles.includes(role)) return res.status(400).json({ error: 'Invalid role' });

    const user = await User.findOne({ role });
    if (!user) return res.status(404).json({ error: `No user found with role ${role}` });

    const token = jwt.sign(
      { id: user._id, name: user.name, email: user.email, role: user.role, institutionId: user.institutionId, institutionName: user.institutionName, aictePermanentId: user.aictePermanentId, bankName: user.bankName },
      process.env.JWT_SECRET || 'aicte_fdr_hackathon_secret_key_2024',
      { expiresIn: '24h' }
    );

    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role, institutionId: user.institutionId, institutionName: user.institutionName, bankName: user.bankName } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all users (for admin purposes)
router.get('/users', auth, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
