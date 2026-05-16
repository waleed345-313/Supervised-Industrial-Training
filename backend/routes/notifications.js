const express = require('express');
const Notification = require('../models/Notification');
const Announcement = require('../models/Announcement');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

function normalizeNotification(doc) {
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    id: String(o._id),
    title: o.title,
    message: o.message,
    type: o.type || 'info',
    date: o.date instanceof Date ? o.date.toISOString() : String(o.date || ''),
    read: !!o.read,
    userId: o.userId ? String(o.userId) : undefined,
  };
}

// @route   GET /api/notifications
// @desc    Get all notifications
router.get('/', async (req, res) => {
  try {
    const notifications = await Notification.find().populate('userId');
    res.json(notifications);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/notifications/:id
// @desc    Get notification by ID
router.get('/:id', async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id).populate('userId');
    if (!notification) {
      return res.status(404).json({ msg: 'Notification not found' });
    }
    res.json(notification);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/notifications
// @desc    Create a notification
router.post('/', async (req, res) => {
  try {
    const notification = new Notification(req.body);
    await notification.save();
    res.json(notification);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT /api/notifications/:id
// @desc    Update notification
router.put('/:id', async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('userId');
    if (!notification) {
      return res.status(404).json({ msg: 'Notification not found' });
    }
    res.json(notification);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE /api/notifications/:id
// @desc    Delete notification
router.delete('/:id', async (req, res) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);
    if (!notification) {
      return res.status(404).json({ msg: 'Notification not found' });
    }
    res.json({ msg: 'Notification deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/notifications/student/me
// @desc    Get notifications for logged-in student
router.get('/student/me', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const notifications = await Notification.find({
      $or: [
        { userId: userId },
        { userId: null },
        { userId: { $exists: false } }
      ]
    }).sort({ date: -1 }).limit(50);
    res.json(notifications.map(normalizeNotification));
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/notifications/student/:id/read
// @desc    Mark notification as read
router.post('/student/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ msg: 'Notification not found' });
    }
    res.json(normalizeNotification(notification));
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;