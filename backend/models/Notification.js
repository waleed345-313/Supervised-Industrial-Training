const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: {
    type: String,
    enum: ['info', 'success', 'warning', 'error'],
    default: 'info'
  },
  date: { type: Date, default: Date.now },
  read: { type: Boolean, default: false },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Optional: for user-specific notifications
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);