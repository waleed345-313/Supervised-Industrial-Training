const mongoose = require('mongoose');

const conversationMessageSchema = new mongoose.Schema(
  {
    /**
     * This collection stores BOTH:
     * - Group metadata docs (kind='group')
     * - Group message docs (kind='message')
     *
     * We intentionally do not use a separate Conversation model.
     */
    kind: { type: String, enum: ['group', 'message'], required: true, index: true },

    // ------------------------
    // Group metadata (kind=group)
    // ------------------------
    name: { type: String, trim: true }, // group name
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // ------------------------
    // Group messages (kind=message)
    // ------------------------
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'ConversationMessage', index: true }, // points to group meta doc (_id)
    fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    fromRole: { type: String },
    content: { type: String },
    subject: { type: String, trim: true, default: '' }, // optional; kept for email-like UX
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // Attachments for group messages (stored as base64 data)
    attachments: [{
      name: { type: String, required: true },
      type: { type: String, required: true },
      size: { type: Number, required: true },
      data: { type: String, required: true }, // base64 encoded file data
    }],
  },
  { timestamps: true }
);

conversationMessageSchema.index({ conversationId: 1, createdAt: 1 });
conversationMessageSchema.index({ participants: 1, kind: 1 });

conversationMessageSchema.pre('validate', function validateShape(next) {
  try {
    if (this.kind === 'group') {
      if (!String(this.name || '').trim()) {
        return next(new Error('Group name is required'));
      }
      if (!this.createdBy) {
        return next(new Error('createdBy is required'));
      }
      if (!Array.isArray(this.participants) || this.participants.length < 2) {
        return next(new Error('At least 2 participants are required'));
      }
    }
    if (this.kind === 'message') {
      if (!this.conversationId) {
        return next(new Error('conversationId is required'));
      }
      if (!this.fromUserId) {
        return next(new Error('fromUserId is required'));
      }
      if (!String(this.fromRole || '').trim()) {
        return next(new Error('fromRole is required'));
      }
      if (!String(this.content || '').trim()) {
        return next(new Error('content is required'));
      }
    }
    return next();
  } catch (e) {
    return next(e);
  }
});

module.exports = mongoose.model('ConversationMessage', conversationMessageSchema);

