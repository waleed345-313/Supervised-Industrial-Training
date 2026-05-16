const express = require('express');
const mongoose = require('mongoose');
const Message = require('../models/message');
const ConversationMessage = require('../models/ConversationMessage');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

const ACTOR_ROLES = ['university_focal', 'academic_supervisor', 'industrial_supervisor', 'company_focal'];

function isActorRole(role) {
  return ACTOR_ROLES.includes(String(role || ''));
}

function normalizeUser(u) {
  if (!u) return null;
  const obj = u.toObject ? u.toObject() : u;
  return {
    id: String(obj._id || obj.id),
    name: obj.name,
    email: obj.email,
    role: obj.role,
    avatar: obj.avatar,
    department: obj.department,
    companyId: obj.companyId ? String(obj.companyId) : undefined,
  };
}

function toGroupPayload({ g }) {
  return {
    id: String(g._id),
    name: g.name,
    createdBy: String(g.createdBy),
    participants: (g.participants || []).map(normalizeUser),
    updatedAt: g.updatedAt,
    createdAt: g.createdAt,
  };
}

function toGroupMessagePayload({ m, fromUser, currentUserId }) {
  const fromId = String(fromUser._id || fromUser.id);
  const me = String(currentUserId);
  const readBy = Array.isArray(m.readBy) ? m.readBy.map((x) => String(x?._id || x?.id || x)) : [];
  return {
    id: String(m._id),
    conversationId: String(m.conversationId),
    from: fromUser.name,
    fromRole: m.fromRole,
    subject: m.subject || '',
    content: m.content,
    date: new Date(m.createdAt).toISOString().slice(0, 10),
    read: readBy.includes(me),
    unread: !readBy.includes(me),
    fromUserId: fromId,
    attachments: m.attachments || [],
  };
}

function toMessagePayload({ m, fromUser, toUser, currentUserId }) {
  const fromId = String(fromUser._id || fromUser.id);
  const toId = String(toUser._id || toUser.id);
  return {
    id: String(m._id),
    from: fromUser.name,
    fromRole: m.fromRole,
    to: toUser.name,
    toRole: m.toRole,
    subject: m.subject,
    content: m.content,
    date: new Date(m.createdAt).toISOString().slice(0, 10),
    unread: !m.read && toId === String(currentUserId),
    read: m.read,
    fromUserId: fromId,
    toUserId: toId,
    replyTo: m.replyTo ? String(m.replyTo) : undefined,
    attachments: m.attachments || [],
  };
}

// -----------------------------------------------------------------------------
// Group conversations (CC / WhatsApp-like groups)
// -----------------------------------------------------------------------------

// @route   POST /api/messages/groups
// @desc    Create a group conversation (actors only)
router.post('/groups', auth, async (req, res) => {
  try {
    const currentUserId = String(req.user.id);
    const fromRole = String(req.user.role);
    if (!isActorRole(fromRole)) {
      return res.status(403).json({ msg: 'Your role cannot create group conversations in this hub' });
    }

    const { name, participantIds } = req.body || {};
    const trimmed = String(name || '').trim();
    if (!trimmed) return res.status(400).json({ msg: 'Group name is required' });

    const raw = Array.isArray(participantIds) ? participantIds : [];
    const ids = raw.map(String).filter(Boolean);
    // Always include creator
    if (!ids.includes(currentUserId)) ids.push(currentUserId);

    const objectIds = ids
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));
    if (objectIds.length < 2) {
      return res.status(400).json({ msg: 'At least 2 valid participants are required' });
    }

    const users = await User.find({ _id: { $in: objectIds } }).select('role name email avatar department companyId');
    if (!users.length) return res.status(400).json({ msg: 'Participants not found' });
    const invalid = users.find((u) => !isActorRole(u.role));
    if (invalid) return res.status(403).json({ msg: 'Only actor roles can be added to group conversations' });

    const group = new ConversationMessage({
      kind: 'group',
      name: trimmed,
      createdBy: new mongoose.Types.ObjectId(currentUserId),
      participants: users.map((u) => u._id),
    });
    await group.save();

    const payload = toGroupPayload({ g: { ...group.toObject(), participants: users } });
    res.json(payload);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/messages/groups
// @desc    List group conversations for current user (actors only)
router.get('/groups', auth, async (req, res) => {
  try {
    const currentUserId = String(req.user.id);
    const fromRole = String(req.user.role);
    if (!isActorRole(fromRole)) {
      return res.status(403).json({ msg: 'Your role cannot use group conversations in this hub' });
    }

    const currentUserObjectId = mongoose.Types.ObjectId.isValid(currentUserId)
      ? new mongoose.Types.ObjectId(currentUserId)
      : null;
    if (!currentUserObjectId) return res.status(400).json({ msg: 'Invalid user id' });

    const groups = await ConversationMessage.find({ kind: 'group', participants: currentUserObjectId })
      .sort({ updatedAt: -1 })
      .populate('participants', 'name email role avatar department companyId')
      .lean();

    const groupIds = groups.map((g) => g._id);
    const lastByGroup = await ConversationMessage.aggregate([
      { $match: { kind: 'message', conversationId: { $in: groupIds } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$conversationId',
          lastMessageId: { $first: '$_id' },
          lastCreatedAt: { $first: '$createdAt' },
        },
      },
    ]);
    const lastIds = lastByGroup.map((x) => x.lastMessageId);
    const lastMessages = await ConversationMessage.find({ _id: { $in: lastIds } })
      .populate('fromUserId', 'name email role avatar department companyId')
      .lean();
    const lastMap = new Map(lastMessages.map((m) => [String(m.conversationId), m]));

    const unreadAgg = await ConversationMessage.aggregate([
      { $match: { kind: 'message', conversationId: { $in: groupIds } } },
      {
        $addFields: {
          readByStr: {
            $map: {
              input: { $ifNull: ['$readBy', []] },
              as: 'u',
              in: { $toString: '$$u' },
            },
          },
        },
      },
      { $match: { readByStr: { $ne: currentUserId } } },
      { $group: { _id: '$conversationId', unreadCount: { $sum: 1 } } },
    ]);
    const unreadMap = new Map(unreadAgg.map((x) => [String(x._id), x.unreadCount]));

    const payload = groups.map((g) => {
      const last = lastMap.get(String(g._id));
      const lastPayload = last
        ? toGroupMessagePayload({ m: last, fromUser: last.fromUserId, currentUserId })
        : null;
      return {
        id: String(g._id),
        name: g.name,
        participants: (g.participants || []).map(normalizeUser),
        lastMessage: lastPayload,
        unreadCount: unreadMap.get(String(g._id)) || 0,
        updatedAt: g.updatedAt,
      };
    });

    res.json(payload);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/messages/groups/:groupId/messages
// @desc    Get group messages (optionally markRead=true)
router.get('/groups/:groupId/messages', auth, async (req, res) => {
  try {
    const currentUserId = String(req.user.id);
    const fromRole = String(req.user.role);
    if (!isActorRole(fromRole)) {
      return res.status(403).json({ msg: 'Your role cannot use group conversations in this hub' });
    }

    const { groupId } = req.params;
    const groupObjectId = mongoose.Types.ObjectId.isValid(groupId) ? new mongoose.Types.ObjectId(groupId) : null;
    const currentUserObjectId = mongoose.Types.ObjectId.isValid(currentUserId)
      ? new mongoose.Types.ObjectId(currentUserId)
      : null;
    if (!groupObjectId || !currentUserObjectId) return res.status(400).json({ msg: 'Invalid id' });

    const group = await ConversationMessage.findOne({ _id: groupObjectId, kind: 'group' })
      .select('participants name')
      .lean();
    if (!group) return res.status(404).json({ msg: 'Group not found' });
    const isMember = (group.participants || []).some((p) => String(p) === currentUserId);
    if (!isMember) return res.status(403).json({ msg: 'Not a group member' });

    const markRead = String(req.query.markRead || '').toLowerCase() === 'true';
    if (markRead) {
      await ConversationMessage.updateMany(
        { kind: 'message', conversationId: groupObjectId, readBy: { $ne: currentUserObjectId } },
        { $addToSet: { readBy: currentUserObjectId } }
      );
    }

    const messages = await ConversationMessage.find({ kind: 'message', conversationId: groupObjectId })
      .sort({ createdAt: 1 })
      .populate('fromUserId', 'name email role avatar department companyId')
      .lean();

    const payload = messages.map((m) => toGroupMessagePayload({ m, fromUser: m.fromUserId, currentUserId }));
    res.json(payload);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/messages/groups/:groupId/messages
// @desc    Send a message to a group (actors only)
router.post('/groups/:groupId/messages', auth, async (req, res) => {
  try {
    const currentUserId = String(req.user.id);
    const fromRole = String(req.user.role);
    if (!isActorRole(fromRole)) {
      return res.status(403).json({ msg: 'Your role cannot send group messages in this hub' });
    }

    const { groupId } = req.params;
    const groupObjectId = mongoose.Types.ObjectId.isValid(groupId) ? new mongoose.Types.ObjectId(groupId) : null;
    const currentUserObjectId = mongoose.Types.ObjectId.isValid(currentUserId)
      ? new mongoose.Types.ObjectId(currentUserId)
      : null;
    if (!groupObjectId || !currentUserObjectId) return res.status(400).json({ msg: 'Invalid id' });

    const { content, subject, attachments } = req.body || {};
    const text = String(content || '').trim();
    const subj = String(subject || '').trim();
    if (!text) return res.status(400).json({ msg: 'content is required' });

    const group = await ConversationMessage.findOne({ _id: groupObjectId, kind: 'group' })
      .select('participants name')
      .lean();
    if (!group) return res.status(404).json({ msg: 'Group not found' });
    const isMember = (group.participants || []).some((p) => String(p) === currentUserId);
    if (!isMember) return res.status(403).json({ msg: 'Not a group member' });

    const fromUser = await User.findById(currentUserId).select('name email role avatar department companyId');
    if (!fromUser) return res.status(404).json({ msg: 'Sender user not found' });

    const msg = new ConversationMessage({
      kind: 'message',
      conversationId: groupObjectId,
      fromUserId: currentUserObjectId,
      fromRole,
      subject: subj,
      content: text,
      // sender has read their own message
      readBy: [currentUserObjectId],
      attachments: Array.isArray(attachments) ? attachments : [],
    });
    await msg.save();

    const payload = toGroupMessagePayload({ m: msg.toObject ? msg.toObject() : msg, fromUser, currentUserId });

    const io = req.app.get('io');
    if (io) {
      // Notify all participants (fan-out) using existing per-user rooms.
      for (const p of group.participants || []) {
        io.to(String(p)).emit('message:group:new', { conversationId: groupId, message: payload });
      }
    }

    res.json(payload);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/messages/threads
// @desc    Get conversation threads (last message + unread counts) for the current user
router.get('/threads', auth, async (req, res) => {
  try {
    const currentUserId = String(req.user.id);
    const currentUserObjectId = mongoose.Types.ObjectId.isValid(currentUserId)
      ? new mongoose.Types.ObjectId(currentUserId)
      : null;
    if (!currentUserObjectId) return res.status(400).json({ msg: 'Invalid user id' });

    const messages = await Message.find({
      $or: [{ fromUserId: currentUserObjectId }, { toUserId: currentUserObjectId }],
    })
      .sort({ createdAt: -1 })
      .limit(1000)
      .populate('fromUserId', 'name email role avatar department companyId')
      .populate('toUserId', 'name email role avatar department companyId')
      .lean();

    const threadMap = new Map(); // otherUserId -> { otherUser, lastMessagePayload, unreadCount }

    for (const m of messages) {
      const fromUserId = String(m.fromUserId?._id || m.fromUserId?.id);
      const toUserId = String(m.toUserId?._id || m.toUserId?.id);
      const isSentByMe = fromUserId === currentUserId;
      const otherUserId = isSentByMe ? toUserId : fromUserId;
      if (!threadMap.has(otherUserId)) {
        const otherUser = isSentByMe ? normalizeUser(m.toUserId) : normalizeUser(m.fromUserId);
        const payload = toMessagePayload({
          m,
          fromUser: m.fromUserId,
          toUser: m.toUserId,
          currentUserId,
        });
        threadMap.set(otherUserId, {
          otherUser,
          lastMessage: payload,
          unreadCount: 0,
        });
      }

      const isUnreadForMe = toUserId === currentUserId && !m.read;
      if (isUnreadForMe) {
        threadMap.get(otherUserId).unreadCount += 1;
      }
    }

    res.json(Array.from(threadMap.values()));
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/messages/thread/:withUserId
// @desc    Get all messages between current user and another user
router.get('/thread/:withUserId', auth, async (req, res) => {
  try {
    const currentUserId = String(req.user.id);
    const { withUserId } = req.params;

    const currentUserObjectId = mongoose.Types.ObjectId.isValid(currentUserId)
      ? new mongoose.Types.ObjectId(currentUserId)
      : null;
    const withUserObjectId = mongoose.Types.ObjectId.isValid(withUserId)
      ? new mongoose.Types.ObjectId(withUserId)
      : null;

    if (!currentUserObjectId || !withUserObjectId) {
      return res.status(400).json({ msg: 'Invalid user id(s)' });
    }

    const markRead = String(req.query.markRead || '').toLowerCase() === 'true';
    if (markRead) {
      await Message.updateMany(
        { fromUserId: withUserObjectId, toUserId: currentUserObjectId, read: false },
        { $set: { read: true } }
      );
    }

    const messages = await Message.find({
      $or: [
        { fromUserId: currentUserObjectId, toUserId: withUserObjectId },
        { fromUserId: withUserObjectId, toUserId: currentUserObjectId },
      ],
    })
      .sort({ createdAt: 1 })
      .populate('fromUserId', 'name email role avatar department companyId')
      .populate('toUserId', 'name email role avatar department companyId')
      .lean();

    const payload = messages.map((m) =>
      toMessagePayload({
        m,
        fromUser: m.fromUserId,
        toUser: m.toUserId,
        currentUserId,
      })
    );

    res.json(payload);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/messages
// @desc    Store a new message from the authenticated user to another registered user
router.post('/', auth, async (req, res) => {
  try {
    const { toUserId, subject, content, replyTo } = req.body || {};
    const fromUserId = String(req.user.id);
    const fromRole = String(req.user.role);

    if (!toUserId || !subject || !content) {
      return res.status(400).json({ msg: 'toUserId, subject, and content are required' });
    }
    if (!ACTOR_ROLES.includes(fromRole)) {
      return res.status(403).json({ msg: 'Your role cannot send messages in this hub' });
    }

    const toUser = await User.findById(toUserId).select('name email role avatar department companyId');
    if (!toUser) return res.status(404).json({ msg: 'Recipient user not found' });
    if (!ACTOR_ROLES.includes(toUser.role)) {
      return res.status(403).json({ msg: 'Recipient role cannot receive messages in this hub' });
    }

    const fromUser = await User.findById(fromUserId).select('name email role avatar department companyId');
    if (!fromUser) return res.status(404).json({ msg: 'Sender user not found' });

    const message = new Message({
      fromUserId,
      toUserId,
      fromRole,
      toRole: toUser.role,
      subject,
      content,
      replyTo: replyTo || undefined,
      read: false,
      attachments: req.body.attachments || [],
    });

    await message.save();

    const io = req.app.get('io');
    const payload = toMessagePayload({
      m: message.toObject ? message.toObject() : message,
      fromUser,
      toUser,
      currentUserId: fromUserId,
    });

    // Notify both sender and recipient instantly.
    if (io) {
      io.to(String(fromUserId)).emit('message:new', payload);
      io.to(String(toUserId)).emit('message:new', payload);
    }

    res.json(payload);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;

