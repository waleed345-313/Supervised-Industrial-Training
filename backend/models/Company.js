const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: { type: String, required: true },
  industry: { type: String, required: true },
  location: { type: String, required: true },
  website: { type: String, required: true },
  description: { type: String, required: true },
  logo: String,
  contactPerson: { type: String, required: true },
  contactEmail: { type: String, required: true },
  assignedSupervisor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Company', companySchema);