const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  studentId: { type: String, required: true, unique: true },
  cgpa: { type: Number, required: true },
  specialization: { type: String, required: true },
  applicationCount: { type: Number, default: 0 },
  maxApplications: { type: Number, default: 2 },
  currentStatus: {
    type: String,
    enum: ['not_applied', 'applied', 'shortlisted', 'allocated', 'rejected', 'completed'],
    default: 'not_applied',
  },
  sitPhase: {
    type: String,
    enum: ['sit_1', 'sit_2'],
  },
  allocatedCompany: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  shortlistedCompany: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  academicSupervisor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema);