const mongoose = require('mongoose');
const Student = require('../models/Student');
const Company = require('../models/Company');
const Application = require('../models/Application');

/**
 * Students an academic supervisor may act on (matches /api/supervisor/students scope).
 * Map: studentUserId -> { companyId, companyName, status } from application, or { direct: true }.
 */
async function getSupervisorStudentScope(supervisorUserId) {
  const sid =
    mongoose.Types.ObjectId.isValid(supervisorUserId)
      ? new mongoose.Types.ObjectId(supervisorUserId)
      : null;
  if (!sid) return new Map();

  const studentMap = new Map();

  const direct = await Student.find({ academicSupervisor: sid }).select('user').lean();
  for (const row of direct) {
    studentMap.set(String(row.user), { direct: true });
  }

  const assignedCompanies = await Company.find({ assignedSupervisor: sid }).select('_id name');
  const companyIds = assignedCompanies.map((c) => c._id);

  if (companyIds.length > 0) {
    const applications = await Application.find({
      company: { $in: companyIds },
      status: { $in: ['shortlisted', 'allocated'] },
    })
      .select('studentUser company status studentName companyName')
      .lean();

    for (const app of applications) {
      const userId = String(app.studentUser);
      if (!studentMap.has(userId)) {
        studentMap.set(userId, {
          companyId: app.company ? String(app.company) : undefined,
          companyName: app.companyName,
          status: app.status,
        });
      }
    }
  }

  return studentMap;
}

function scopeHasStudent(scope, studentUserId) {
  return scope.has(String(studentUserId));
}

module.exports = {
  getSupervisorStudentScope,
  scopeHasStudent,
};
