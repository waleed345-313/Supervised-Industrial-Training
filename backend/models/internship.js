const mongoose = require('mongoose');

const internshipSchema = new mongoose.Schema({
  title: { type: String, required: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  description: { type: String, required: true },
  requirements: [{ type: String }],
  specializations: [{ type: String }],
  location: { type: String }, // Auto-populated from company, no longer required
  duration: { type: String, required: true },
  seats: { type: Number, required: true },
  seatsFilled: { type: Number, default: 0 },
  applicationsCount: { type: Number, default: 0 },
  deadline: { type: Date },
  status: {
    type: String,
    enum: ['open', 'closed', 'filled'],
    default: 'open',
  },
  postedDate: { type: Date, default: Date.now },
  // Hard requirements
  cgpa: { type: String, enum: ['3.5+', '3.0+', '2.5+', '2.0+'] },
  gender: { type: String, enum: ['Male', 'Female', 'Customized'], default: 'Customized' },
  interview: { type: String, enum: ['Yes', 'No'], default: 'No' },
}, { timestamps: true });

module.exports = mongoose.model('Internship', internshipSchema);
