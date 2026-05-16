const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    toUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Cache role strings so we can show them even if roles change later.
    fromRole: { type: String, required: true },
    toRole: { type: String, required: true },

    subject: { type: String, required: true, trim: true },
    content: { type: String, required: true },

    // If this message is a reply, store the parent message id.
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },

    // Read state is per-recipient.
    read: { type: Boolean, default: false },

    // Attachments stored as base64 data
    attachments: [{
      name: { type: String, required: true },
      type: { type: String, required: true },
      size: { type: Number, required: true },
      data: { type: String, required: true }, // base64 encoded file data
    }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Message', messageSchema);

