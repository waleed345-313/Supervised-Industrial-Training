const mongoose = require('mongoose');

const progressReportSchema = new mongoose.Schema({
  studentUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  studentName: { type: String, required: true }, // cached
  month: { type: String, required: true },
  submittedDate: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'approved'],
    default: 'pending'
  },
  industrialRemarks: String,
  academicRemarks: String,
  summary: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('ProgressReport', progressReportSchema);