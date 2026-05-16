const mongoose = require('mongoose');

const companyFocalFeedbackSchema = new mongoose.Schema(
  {
    studentUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    focalUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    studentName: { type: String, required: true },
    companyName: { type: String, required: true },
    focalName: { type: String, required: true },
    performanceRating: { type: Number, required: true, min: 1, max: 10 },
    attendanceRating: { type: Number, required: true, min: 1, max: 10 },
    professionalismRating: { type: Number, required: true, min: 1, max: 10 },
    technicalSkillsRating: { type: Number, required: true, min: 1, max: 10 },
    communicationRating: { type: Number, required: true, min: 1, max: 10 },
    overallScore: { type: Number, required: true, min: 1, max: 10 },
    remarks: { type: String, default: '' },
    recommendation: {
      type: String,
      enum: ['highly_recommend', 'recommend', 'neutral', 'not_recommend'],
      required: true,
    },
    status: { type: String, default: 'submitted' },
  },
  { timestamps: true }
);

companyFocalFeedbackSchema.index({ studentUser: 1, company: 1 }, { unique: true });

module.exports = mongoose.model('CompanyFocalFeedback', companyFocalFeedbackSchema);
