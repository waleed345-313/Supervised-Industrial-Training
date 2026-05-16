const Application = require('../models/Application');
const Student = require('../models/Student');
const Internship = require('../models/internship');
const Company = require('../models/Company');

async function refundApplicationSlot(studentUserId, application) {
  if (application?.isReplacement) return;
  const stud = await Student.findOne({ user: studentUserId });
  if (!stud) return;
  stud.applicationCount = Math.max(0, (stud.applicationCount || 0) - 1);
  if (application?.company && String(stud.shortlistedCompany || '') === String(application.company || '')) {
    stud.shortlistedCompany = undefined;
  }
  if (stud.applicationCount === 0) stud.currentStatus = 'not_applied';
  else stud.currentStatus = 'applied';
  await stud.save();
}

async function rejectRemainingApplicationsForInternship(internshipId, exceptApplicationId) {
  const others = await Application.find({
    internshipId,
    status: { $in: ['pending', 'shortlisted'] },
    _id: { $ne: exceptApplicationId },
  });
  for (const o of others) {
    o.status = 'rejected';
    await o.save();
    await refundApplicationSlot(o.studentUser, o);
  }
}

async function syncStudentShortlisted(application) {
  const stud = await Student.findOne({ user: application.studentUser });
  if (!stud) return;
  stud.shortlistedCompany = application.company;
  stud.currentStatus = 'shortlisted';
  await stud.save();
}

/**
 * Allocate seat: set application to allocated (if needed), update student & internship, auto-reject when full.
 * Returns { ok: true } or { ok: false, reason: string }
 */
async function applyAllocationEffects(applicationId) {
  const app = await Application.findById(applicationId);
  if (!app || app.seatCounted) return { ok: true, app };

  const intern = await Internship.findById(app.internshipId);
  if (!intern) {
    app.seatCounted = true;
    if (app.status !== 'allocated') {
      app.status = 'allocated';
    }
    await app.save();
    return { ok: true, app };
  }

  if ((intern.seatsFilled || 0) >= intern.seats) {
    return { ok: false, reason: 'no_seats', app };
  }

  if (app.status !== 'allocated') {
    app.status = 'allocated';
    await app.save();
  }

  // Transfer flow: if student was already allocated elsewhere, release old seat and mark old allocation rejected.
  const previousAllocatedApps = await Application.find({
    studentUser: app.studentUser,
    _id: { $ne: app._id },
    status: 'allocated',
    seatCounted: true,
  });

  for (const oldApp of previousAllocatedApps) {
    const oldIntern = await Internship.findById(oldApp.internshipId);
    if (oldIntern) {
      oldIntern.seatsFilled = Math.max(0, (oldIntern.seatsFilled || 0) - 1);
      if (oldIntern.status === 'filled' && oldIntern.seatsFilled < oldIntern.seats) {
        oldIntern.status = 'open';
      }
      await oldIntern.save();
    }
    oldApp.status = 'rejected';
    oldApp.seatCounted = false;
    oldApp.remarks = oldApp.remarks
      ? `${oldApp.remarks} | Auto-released due to transfer to another company`
      : 'Auto-released due to transfer to another company';
    await oldApp.save();
  }

  const stud = await Student.findOne({ user: app.studentUser });
  if (stud) {
    stud.allocatedCompany = app.company;
    stud.shortlistedCompany = app.company;
    stud.currentStatus = 'allocated';
    stud.sitPhase = 'sit_1';

    // Rebind academic supervisor to the newly allocated company assignment (or clear if none).
    const company = await Company.findById(app.company).select('assignedSupervisor');
    stud.academicSupervisor = company?.assignedSupervisor || undefined;
    
    await stud.save();
  }

  intern.seatsFilled = (intern.seatsFilled || 0) + 1;
  let filledUp = false;
  if (intern.seatsFilled >= intern.seats) {
    intern.status = 'filled';
    filledUp = true;
  }
  await intern.save();

  app.seatCounted = true;
  await app.save();

  if (filledUp) {
    await rejectRemainingApplicationsForInternship(intern._id, app._id);
  }

  return { ok: true, app };
}

module.exports = {
  refundApplicationSlot,
  rejectRemainingApplicationsForInternship,
  syncStudentShortlisted,
  applyAllocationEffects,
};
