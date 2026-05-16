const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['admin', 'manager_placements', 'university_focal', 'academic_supervisor', 'industrial_supervisor', 'company_focal', 'evaluation_panel', 'student'],
    required: true
  },
  avatar: String,
  department: String,
  username: String,
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' }, // company_focal + industrial_supervisor
  cnicNumber: String,
  // student academic details (kept on User for admin edits)
  studentId: String,
  cgpa: Number,
  batch: String,
  section: String,
  gender: { type: String, enum: ['Male', 'Female', 'Other'] },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);