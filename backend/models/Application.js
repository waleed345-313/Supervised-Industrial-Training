const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  studentUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  studentName: { type: String, required: true }, // cached display name
  internshipId: { type: mongoose.Schema.Types.ObjectId, ref: 'Internship', required: true, index: true },
  internshipTitle: { type: String, required: true }, // cached display title
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  companyName: { type: String, required: true }, // cached display company name
  industrialSupervisor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  status: {
    type: String,
    enum: ['pending', 'shortlisted', 'allocated', 'rejected', 'exhaust'],
    default: 'pending'
  },
  appliedDate: { type: Date, default: Date.now },
  remarks: String,
  seatCounted: { type: Boolean, default: false },
  /** Routed by Placement Manager — does not consume the student's 2 priority application slots */
  isReplacement: { type: Boolean, default: false },
  submittedByPlacementManager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Application', applicationSchema);