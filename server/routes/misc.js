const express = require('express');
const AuditLog = require('../models/AuditLog');
const NotificationAlert = require('../models/NotificationAlert');
const { auth } = require('../middleware/auth');
const router = express.Router();

// ============ AUDIT LOGS ============

// Get all audit logs
router.get('/audit', auth, async (req, res) => {
  try {
    const { module, fdrNumber, userRole, limit } = req.query;
    const filter = {};
    if (module) filter.module = module;
    if (fdrNumber) filter.fdrNumber = { $regex: fdrNumber, $options: 'i' };
    if (userRole) filter.userRole = userRole;

    const logs = await AuditLog.find(filter)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit) || 200);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ NOTIFICATIONS ============

// Get notifications
router.get('/notifications', auth, async (req, res) => {
  try {
    const filter = {};
    
    // Role-based notification filtering
    if (req.user.role === 'INSTITUTION') {
      filter.$or = [
        { recipientRole: 'INSTITUTION' },
        { recipientRole: 'ALL' }
      ];
    } else {
      filter.$or = [
        { recipientRole: req.user.role },
        { recipientRole: 'ALL' }
      ];
    }

    const notifications = await NotificationAlert.find(filter)
      .sort({ createdAt: -1 })
      .limit(50);
    
    const unreadCount = await NotificationAlert.countDocuments({ ...filter, isRead: false });
    
    res.json({ notifications, unreadCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark notification as read
router.put('/notifications/:id/read', auth, async (req, res) => {
  try {
    await NotificationAlert.findByIdAndUpdate(req.params.id, { isRead: true });
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark all notifications as read
router.put('/notifications/read-all', auth, async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'INSTITUTION') {
      filter.recipientRole = 'INSTITUTION';
      filter.institutionId = req.user.institutionId;
    } else {
      filter.recipientRole = req.user.role;
    }
    await NotificationAlert.updateMany(filter, { isRead: true });
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
