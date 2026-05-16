const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  targetRoles: [{
    type: String,
    enum: ['student', 'academic_supervisor', 'industrial_supervisor', 'company_focal', 'university_focal', 'manager_placements', 'admin', 'evaluation_panel'],
  }],
  status: {
    type: String,
    enum: ['active', 'archived'],
    default: 'active'
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high'],
    default: 'normal'
  },
}, { timestamps: true });

module.exports = mongoose.model('Announcement', announcementSchema);
