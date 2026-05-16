const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  studentUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  studentName: { type: String, required: true },
  supervisorUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  supervisorName: { type: String, required: true },
  month: { type: String }, // optional: month label for monthly feedback (e.g., "Month 1")
  type: {
    type: String,
    enum: ['monthly-review', 'performance-note', 'progress-update', 'improvement-suggestion', 'commendation'],
    required: true
  },
  message: { type: String, required: true },
  status: { type: String, default: 'Sent' },
  sentAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Feedback', feedbackSchema);
