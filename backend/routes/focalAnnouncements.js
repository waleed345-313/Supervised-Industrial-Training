const express = require('express');
const Notification = require('../models/Notification');
const Announcement = require('../models/Announcement');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

function normalizeAnnouncement(doc) {
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    id: String(o._id),
    title: o.title,
    content: o.content,
    status: o.status || 'active',
    priority: o.priority || 'normal',
    targetRoles: o.targetRoles || [],
    createdBy: o.createdBy ? String(o.createdBy) : undefined,
    createdAt: o.createdAt instanceof Date ? o.createdAt.toISOString() : String(o.createdAt || ''),
    updatedAt: o.updatedAt instanceof Date ? o.updatedAt.toISOString() : String(o.updatedAt || ''),
  };
}

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

// @route   GET /api/focal/announcements
// @desc    Get all announcements created by the logged-in focal person
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const announcements = await Announcement.find({ createdBy: userId })
      .sort({ createdAt: -1 });
    res.json(announcements.map(normalizeAnnouncement));
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/focal/announcements
// @desc    Create announcement and notify target users
router.post('/', auth, async (req, res) => {
  try {
    const { title, content, targetRoles, priority } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!title || !content) {
      return res.status(400).json({ msg: 'Title and content are required' });
    }

    // Create announcement
    const announcement = new Announcement({
      title,
      content,
      createdBy: userId,
      targetRoles: targetRoles || ['student'],
      priority: priority || 'normal',
      status: 'active'
    });
    await announcement.save();

    // Create notifications for target users
    const targetRoleList = targetRoles && targetRoles.length > 0 ? targetRoles : ['student'];
    const targetUsers = await User.find({ role: { $in: targetRoleList } });

    const notificationType = priority === 'high' ? 'warning' : priority === 'normal' ? 'info' : 'success';

    const notifications = targetUsers.map(user => ({
      title: title,
      message: content,
      type: notificationType,
      userId: user._id,
      read: false,
      date: new Date()
    }));

    // Also create a broadcast notification (no userId) for any future users
    notifications.push({
      title: title,
      message: content,
      type: notificationType,
      read: false,
      date: new Date()
    });

    await Notification.insertMany(notifications);

    // Emit socket event to notify connected clients
    const io = req.app.get('io');
    if (io) {
      // Emit to specific roles
      targetRoleList.forEach(role => {
        io.emit(`announcement:${role}`, {
          type: 'new-announcement',
          announcement: normalizeAnnouncement(announcement)
        });
      });
      // Also emit to student update channel for student notifications
      io.emit('student:update', { type: 'notifications' });
    }

    res.status(201).json(normalizeAnnouncement(announcement));
  } catch (err) {
    console.error('Error creating announcement:', err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT /api/focal/announcements/:id
// @desc    Update announcement
router.put('/:id', auth, async (req, res) => {
  try {
    const { title, content, status, priority, targetRoles } = req.body;
    const userId = req.user.id;

    const announcement = await Announcement.findOneAndUpdate(
      { _id: req.params.id, createdBy: userId },
      { title, content, status, priority, targetRoles },
      { new: true }
    );

    if (!announcement) {
      return res.status(404).json({ msg: 'Announcement not found or not authorized' });
    }

    res.json(normalizeAnnouncement(announcement));
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE /api/focal/announcements/:id
// @desc    Delete announcement
router.delete('/:id', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const announcement = await Announcement.findOneAndDelete({
      _id: req.params.id,
      createdBy: userId
    });

    if (!announcement) {
      return res.status(404).json({ msg: 'Announcement not found or not authorized' });
    }

    res.json({ msg: 'Announcement deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
