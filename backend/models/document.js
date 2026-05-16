const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: {
    type: String,
    enum: [
      'acceptance_letter',
      'attendance_sheet',
      'completion_letter',
      'completion_sit_1',
      'completion_sit_2',
      'guideline',
      'report',
      'resume',
    ],
    required: true,
  },
  uploadedBy: { type: String, required: true },
  uploadedByUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  uploadedDate: { type: Date, default: Date.now },
  url: { type: String, required: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  studentUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  studentName: { type: String, required: true },
  application: { type: mongoose.Schema.Types.ObjectId, ref: 'Application' },
  internship: { type: mongoose.Schema.Types.ObjectId, ref: 'Internship' },
  originalFileName: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Document', documentSchema);
