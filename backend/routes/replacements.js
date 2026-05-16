const express = require('express');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Student = require('../models/Student');
const Application = require('../models/Application');
const Internship = require('../models/internship');
const Company = require('../models/Company');
const Document = require('../models/document');

const router = express.Router();

const DOC_TYPES_TO_CLONE = ['resume', 'report', 'guideline'];

function emitPlacementsUpdate(req) {
  const io = req.app.get('io');
  if (io) io.to('placements').emit('placements:update', { type: 'vacancies' });
}

async function assertPlacementManager(req, res) {
  const user = await User.findById(req.user.id);
  if (!user || user.role !== 'manager_placements') {
    res.status(403).json({ msg: 'Placement manager access required' });
    return null;
  }
  return user;
}

function isStudentPlaced(student, apps) {
  if (student?.currentStatus === 'allocated') return true;
  return apps.some((a) => a.status === 'allocated');
}

/**
 * A priority (non-replacement) application is "terminal" for replacement eligibility when
 * it can no longer result in placement through the normal two-slot flow.
 */
function isPriorityApplicationTerminal(app, internship, company) {
  if (app.status === 'rejected') return { terminal: true, reason: 'rejected' };
  if (app.status === 'allocated') return { terminal: false, reason: 'placed' };
  if (app.status === 'shortlisted') return { terminal: false, reason: 'shortlisted' };

  if (app.status === 'pending') {
    if (!company || company.isActive === false) {
      return { terminal: true, reason: 'company_inactive' };
    }
    if (!internship) return { terminal: true, reason: 'internship_missing' };
    if (internship.status !== 'open') {
      return { terminal: true, reason: 'internship_unavailable' };
    }
    const seats = internship.seats || 0;
    const filled = internship.seatsFilled || 0;
    if (seats > 0 && filled >= seats) {
      return { terminal: true, reason: 'no_seats' };
    }
    return { terminal: false, reason: 'pending_open' };
  }

  return { terminal: false, reason: 'unknown' };
}

async function computeReplacementEligibility(studentUserId) {
  const stud = await Student.findOne({ user: studentUserId }).lean();
  const allApps = await Application.find({ studentUser: studentUserId }).sort({ appliedDate: 1 });

  if (isStudentPlaced(stud, allApps)) {
    return { canReplace: false, reason: 'Student is already placed' };
  }

  const priorityApps = allApps.filter((a) => !a.isReplacement);
  if (priorityApps.length !== 2) {
    return {
      canReplace: false,
      reason: 'Both priority applications must be used before replacement routing',
    };
  }

  for (const app of priorityApps) {
    const [intern, comp] = await Promise.all([
      Internship.findById(app.internshipId).lean(),
      Company.findById(app.company).lean(),
    ]);
    const { terminal } = isPriorityApplicationTerminal(app, intern, comp);
    if (!terminal) {
      return {
        canReplace: false,
        reason: 'One or both priority applications are still active',
      };
    }
  }

  return { canReplace: true, reason: null };
}

/** Company IDs where the student received `rejected` on a priority (non-replacement) application */
async function rejectedPriorityCompanyIdSet(studentUserId) {
  const apps = await Application.find({
    studentUser: studentUserId,
    isReplacement: { $ne: true },
    status: 'rejected',
  })
    .select('company')
    .lean();
  const set = new Set();
  for (const a of apps) {
    if (a.company) set.add(String(a.company));
  }
  return set;
}

function normalizeStudentUserId(studentUserId) {
  const s = String(studentUserId);
  if (!mongoose.Types.ObjectId.isValid(s)) return studentUserId;
  return new mongoose.Types.ObjectId(s);
}

/**
 * Copy CV/report/guidelines from priority applications (and by studentUser) onto the replacement application.
 * Resumes are usually stored with `application` = the original application ID; querying only `studentUser`
 * misses matches when refs were stored inconsistently across environments.
 */
async function cloneStudentDocumentsForApplication(studentUserId, application, internship, companyId, studentName) {
  const uid = normalizeStudentUserId(studentUserId);

  const priorityAppRows = await Application.find({
    studentUser: uid,
    isReplacement: { $ne: true },
  })
    .select('_id')
    .lean();

  const priorityIds = priorityAppRows.map((r) => r._id);

  const orClauses = [{ studentUser: uid }];
  if (priorityIds.length > 0) {
    orClauses.push({ application: { $in: priorityIds } });
  }

  const docs = await Document.find({
    type: { $in: DOC_TYPES_TO_CLONE },
    $or: orClauses,
  })
    .sort({ uploadedDate: -1 })
    .lean();

  const bestByType = new Map();
  for (const d of docs) {
    if (!d.url || !d.type) continue;
    if (!DOC_TYPES_TO_CLONE.includes(d.type)) continue;
    if (!bestByType.has(d.type)) bestByType.set(d.type, d);
  }

  const existingOnTarget = await Document.find({ application: application._id }).select('type').lean();
  const existingTypes = new Set(existingOnTarget.map((d) => d.type).filter(Boolean));

  for (const doc of bestByType.values()) {
    if (existingTypes.has(doc.type)) continue;

    await Document.create({
      name: doc.name,
      type: doc.type,
      uploadedBy: doc.uploadedBy,
      uploadedByUser: doc.uploadedByUser,
      url: doc.url,
      company: companyId,
      studentUser: uid,
      studentName,
      application: application._id,
      internship: internship._id,
      originalFileName: doc.originalFileName,
    });

    existingTypes.add(doc.type);
  }
}

// @route   POST /api/placements/replacement/backfill-documents
// @desc    Attach priority CV/files to an existing replacement application (repair older submissions)
router.post('/backfill-documents', auth, async (req, res) => {
  try {
    const actor = await assertPlacementManager(req, res);
    if (!actor) return;

    const { applicationId } = req.body || {};
    if (!applicationId || !mongoose.Types.ObjectId.isValid(String(applicationId))) {
      return res.status(400).json({ msg: 'Valid applicationId is required' });
    }

    const appDoc = await Application.findById(applicationId);
    if (!appDoc) {
      return res.status(404).json({ msg: 'Application not found' });
    }
    if (!appDoc.isReplacement) {
      return res.status(400).json({ msg: 'Only replacement applications can use this repair' });
    }

    const intern = await Internship.findById(appDoc.internshipId);
    if (!intern) {
      return res.status(400).json({ msg: 'Internship missing for this application' });
    }

    const companyId = appDoc.company;
    await cloneStudentDocumentsForApplication(
      appDoc.studentUser,
      appDoc,
      intern,
      companyId,
      appDoc.studentName
    );

    const resumeCount = await Document.countDocuments({
      application: appDoc._id,
      type: 'resume',
    });

    const io = req.app.get('io');
    if (io) {
      const cid = String(companyId);
      io.to(`company:${cid}`).emit('company:update', { type: 'applications' });
    }

    res.json({
      msg: resumeCount ? 'Documents attached where missing' : 'No priority documents found to attach',
      resumeLinked: resumeCount > 0,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/placements/replacement/eligibility/me
// @desc    Whether logged-in student is eligible for replacement routing (inform UI; submit is manager-only)
router.get('/eligibility/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'student') {
      return res.status(403).json({ msg: 'Students only' });
    }
    const r = await computeReplacementEligibility(user._id);
    res.json({
      eligible: r.canReplace,
      reason: r.reason,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/placements/replacement/candidates
router.get('/candidates', auth, async (req, res) => {
  try {
    const actor = await assertPlacementManager(req, res);
    if (!actor) return;

    // List all accounts with student role — many installs only persist User (+ applications) without a Student profile row.
    const studentUsers = await User.find({ role: 'student' })
      .select('name email studentId cgpa department')
      .sort({ name: 1 })
      .lean();

    const out = [];
    for (const u of studentUsers) {
      const userId = u._id;
      const stud = await Student.findOne({ user: userId }).lean();
      const allApps = await Application.find({ studentUser: userId })
        .sort({ appliedDate: -1 })
        .lean();

      const { canReplace, reason } = await computeReplacementEligibility(userId);
      const canChange = true;

      const priorityApps = allApps.filter((a) => !a.isReplacement);
      const prioritySummaries = [];
      for (const pa of priorityApps) {
        const [intern, comp] = await Promise.all([
          Internship.findById(pa.internshipId).select('title status seats seatsFilled').lean(),
          Company.findById(pa.company).select('name isActive').lean(),
        ]);
        const t = isPriorityApplicationTerminal(pa, intern, comp);
        prioritySummaries.push({
          id: String(pa._id),
          status: pa.status,
          internshipTitle: pa.internshipTitle,
          companyName: pa.companyName,
          internshipStatus: intern?.status,
          terminal: t.terminal,
        });
      }

      const replacementApps = allApps.filter((a) => a.isReplacement).map((a) => ({
        id: String(a._id),
        status: a.status,
        internshipTitle: a.internshipTitle,
        companyName: a.companyName,
      }));

      const priorityUsed = priorityApps.length;
      let derivedStatus = stud?.currentStatus;
      if (!derivedStatus) {
        if (allApps.some((a) => a.status === 'allocated')) derivedStatus = 'allocated';
        else if (priorityUsed > 0) derivedStatus = 'applied';
        else derivedStatus = 'not_applied';
      }

      out.push({
        studentUserId: String(userId),
        name: u.name,
        email: u.email,
        studentId: stud?.studentId || u.studentId || '—',
        cgpa: typeof stud?.cgpa === 'number' ? stud.cgpa : typeof u.cgpa === 'number' ? u.cgpa : null,
        specialization: stud?.specialization || u.department || '—',
        applicationCount: typeof stud?.applicationCount === 'number' ? stud.applicationCount : priorityUsed,
        maxApplications: typeof stud?.maxApplications === 'number' ? stud.maxApplications : 2,
        currentStatus: derivedStatus,
        canReplace,
        eligibilityReason: reason,
        canChange,
        changeReason: canChange ? null : 'Student must be currently allocated to request company change',
        priorityApplications: prioritySummaries,
        replacementApplications: replacementApps,
      });
    }

    res.json(out);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/placements/replacement/vacancies
// @desc    Internships with vacant seats; optional includeFilled=1 adds at-capacity postings (placement manager only)
router.get('/vacancies', auth, async (req, res) => {
  try {
    const actor = await assertPlacementManager(req, res);
    if (!actor) return;

    const excludeForStudent = req.query.excludeForStudent;
    let excludeCompanyIds = null;
    if (excludeForStudent && mongoose.Types.ObjectId.isValid(String(excludeForStudent))) {
      excludeCompanyIds = await rejectedPriorityCompanyIdSet(excludeForStudent);
    }

    const internships = await Internship.find()
      .populate('company', 'name isActive location industry')
      .sort({ title: 1 })
      .lean();

    const rows = [];
    for (const i of internships) {
      const comp = i.company;
      if (!comp || comp.isActive === false) continue;

      const companyIdStr = String(comp._id || comp);
      if (excludeCompanyIds && excludeCompanyIds.has(companyIdStr)) continue;

      const seats = i.seats || 0;
      const filled = i.seatsFilled || 0;
      const vacant = Math.max(0, seats - filled);
      const includeFilled =
        String(req.query.includeFilled || '') === '1' || String(req.query.includeFilled || '').toLowerCase() === 'true';

      if (vacant > 0) {
        rows.push({
          internshipId: String(i._id),
          title: i.title,
          companyId: companyIdStr,
          companyName: comp.name,
          location: i.location || comp.location,
          duration: i.duration,
          seats,
          seatsFilled: filled,
          vacantSeats: vacant,
          internshipStatus: i.status,
          deadline: i.deadline instanceof Date ? i.deadline.toISOString().slice(0, 10) : null,
          cgpaRequirement: i.cgpa || null,
          isFull: false,
        });
      } else if (includeFilled && seats > 0 && filled > 0) {
        rows.push({
          internshipId: String(i._id),
          title: i.title,
          companyId: companyIdStr,
          companyName: comp.name,
          location: i.location || comp.location,
          duration: i.duration,
          seats,
          seatsFilled: filled,
          vacantSeats: 0,
          internshipStatus: i.status,
          deadline: i.deadline instanceof Date ? i.deadline.toISOString().slice(0, 10) : null,
          cgpaRequirement: i.cgpa || null,
          isFull: true,
        });
      }
    }

    rows.sort((a, b) => {
      if (Boolean(a.isFull) !== Boolean(b.isFull)) return a.isFull ? 1 : -1;
      return (b.vacantSeats || 0) - (a.vacantSeats || 0);
    });

    res.json(rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/placements/replacement/submit
router.post('/submit', auth, async (req, res) => {
  try {
    const actor = await assertPlacementManager(req, res);
    if (!actor) return;

    const { studentUserId, internshipId, mode } = req.body || {};
    if (!studentUserId || !internshipId || !mongoose.Types.ObjectId.isValid(studentUserId) || !mongoose.Types.ObjectId.isValid(internshipId)) {
      return res.status(400).json({ msg: 'studentUserId and internshipId are required' });
    }

    const allAppsForStudent = await Application.find({ studentUser: studentUserId }).lean();
    const changeMode = mode === 'change';
    if (!changeMode) {
      const elig = await computeReplacementEligibility(studentUserId);
      if (!elig.canReplace) {
        return res.status(400).json({ msg: elig.reason || 'Student is not eligible for replacement' });
      }
    }

    const dup = await Application.findOne({ studentUser: studentUserId, internshipId });
    if (dup) {
      return res.status(400).json({ msg: 'This student already has an application for that internship' });
    }

    const user = await User.findById(studentUserId);
    if (!user || user.role !== 'student') {
      return res.status(400).json({ msg: 'Invalid student user' });
    }

    const intern = await Internship.findById(internshipId).populate('company');
    if (!intern) {
      return res.status(400).json({ msg: 'Internship not found' });
    }

    const companyId = intern.company?._id || intern.company;
    const companyIdStr = companyId ? String(companyId) : '';
    const company = companyId ? await Company.findById(companyId) : null;
    if (!company || company.isActive === false) {
      return res.status(400).json({ msg: 'Company is not available' });
    }

    if (changeMode) {
      const allocatedApp = allAppsForStudent.find((a) => a.status === 'allocated');
      if (allocatedApp && String(allocatedApp.company) === String(companyId)) {
        return res.status(400).json({ msg: 'Student is already allocated to this company' });
      }
    }

    const seats = intern.seats || 0;
    const filled = intern.seatsFilled || 0;
    if (seats > 0 && filled >= seats) {
      return res.status(400).json({ msg: 'No vacant seats for this internship' });
    }

    const rejectedAtCompanies = await rejectedPriorityCompanyIdSet(studentUserId);
    if (companyIdStr && rejectedAtCompanies.has(companyIdStr)) {
      return res.status(400).json({
        msg: 'Replacement cannot be routed to a company that rejected this student on a standard (priority) application.',
      });
    }

    const manager = await User.findById(actor._id);
    const remarks = changeMode
      ? `Company change applicant — submitted by Placement Office${manager?.name ? ` (${manager.name})` : ''}.`
      : `Replacement applicant — submitted by Placement Office${manager?.name ? ` (${manager.name})` : ''}.`;

    const application = new Application({
      studentUser: user._id,
      studentName: user.name,
      internshipId,
      internshipTitle: intern.title,
      company: companyId,
      companyName: company.name,
      status: 'pending',
      remarks,
      isReplacement: true,
      submittedByPlacementManager: actor._id,
    });
    await application.save();

    await Internship.findByIdAndUpdate(internshipId, { $inc: { applicationsCount: 1 } });

    await cloneStudentDocumentsForApplication(
      user._id,
      application,
      intern,
      companyId,
      user.name
    );

    const populated = await Application.findById(application._id)
      .populate({ path: 'studentUser', select: 'cgpa' })
      .populate('internshipId');

    const io = req.app.get('io');
    if (io) {
      io.to(`company:${companyIdStr}`).emit('company:update', { type: 'applications' });
      io.to(String(studentUserId)).emit('student:update', { type: 'application' });
      emitPlacementsUpdate(req);
    }

    const o = populated.toObject ? populated.toObject() : populated;
    const su = o.studentUser;
    const suCgpa =
      su && typeof su === 'object' && su.cgpa != null ? Number(su.cgpa).toFixed(2) : null;
    const internRef = o.internshipId;
    const appliedDate = o.appliedDate;
    res.json({
      msg: 'Replacement application submitted',
      application: {
        id: String(o._id),
        studentId: String(su?._id != null ? su._id : studentUserId),
        studentName: o.studentName,
        internshipId: String(internRef?._id != null ? internRef._id : internshipId),
        internshipTitle: o.internshipTitle,
        companyName: o.companyName,
        companyId: companyIdStr,
        status: o.status,
        appliedDate:
          appliedDate instanceof Date
            ? appliedDate.toISOString().slice(0, 10)
            : String(appliedDate || '').slice(0, 10),
        remarks: o.remarks,
        studentCGPA: suCgpa,
        isReplacement: true,
      },
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

/**
 * Placement manager: remove a student's active allocation, decrement internship seat count,
 * so another student can be routed to that company.
 */
async function releasePlacementSeatForStudent(studentUserId) {
  const uid = normalizeStudentUserId(studentUserId);
  const app = await Application.findOne({ studentUser: uid, status: 'allocated' }).sort({ appliedDate: -1 });
  if (!app) {
    return { ok: false, reason: 'not_allocated' };
  }

  const intern = app.internshipId ? await Internship.findById(app.internshipId) : null;
  if (intern && app.seatCounted) {
    intern.seatsFilled = Math.max(0, (intern.seatsFilled || 0) - 1);
    if (intern.status === 'filled' && intern.seatsFilled < (intern.seats || 0)) {
      intern.status = 'open';
    }
    await intern.save();
  }

  app.seatCounted = false;
  app.status = 'rejected';
  app.remarks = app.remarks
    ? `${app.remarks} | Seat released by Placement Office`
    : 'Seat released by Placement Office — allocation removed to free capacity';
  await app.save();

  const stud = await Student.findOne({ user: uid });
  if (stud) {
    const appCompany = String(app.company || '');
    if (String(stud.allocatedCompany || '') === appCompany) {
      stud.allocatedCompany = undefined;
    }
    stud.shortlistedCompany = undefined;

    const others = await Application.find({ studentUser: uid, _id: { $ne: app._id } }).lean();
    const hasShortlisted = others.some((a) => a.status === 'shortlisted');
    const hasPending = others.some((a) => a.status === 'pending');
    const hasOtherAllocated = others.some((a) => a.status === 'allocated');

    if (hasOtherAllocated) {
      const otherAlloc = others.find((a) => a.status === 'allocated');
      if (otherAlloc?.company) stud.allocatedCompany = otherAlloc.company;
      stud.currentStatus = 'allocated';
    } else if (hasShortlisted) {
      const sh = others.find((a) => a.status === 'shortlisted');
      if (sh?.company) stud.shortlistedCompany = sh.company;
      stud.currentStatus = 'shortlisted';
    } else if (hasPending) {
      stud.currentStatus = 'applied';
    } else {
      stud.currentStatus = 'applied';
    }

    stud.academicSupervisor = undefined;
    await stud.save();
  }

  return { ok: true, studentUserId: String(uid), applicationId: String(app._id), companyId: String(app.company || '') };
}

// @route   POST /api/placements/replacement/release-allocations
// @desc    Free internship seats by revoking selected students' allocated applications (placement manager)
router.post('/release-allocations', auth, async (req, res) => {
  try {
    const actor = await assertPlacementManager(req, res);
    if (!actor) return;

    const raw = req.body?.studentUserIds;
    const ids = Array.isArray(raw) ? raw : [];
    const validIds = ids.filter((id) => id && mongoose.Types.ObjectId.isValid(String(id)));

    if (validIds.length === 0) {
      return res.status(400).json({ msg: 'studentUserIds array is required' });
    }

    const results = [];
    for (const id of validIds) {
      // eslint-disable-next-line no-await-in-loop
      const r = await releasePlacementSeatForStudent(id);
      results.push({ studentUserId: String(id), ...r });
    }

    const io = req.app.get('io');
    if (io) {
      const companyIds = new Set();
      for (const r of results) {
        if (r.ok && r.studentUserId) {
          io.to(String(r.studentUserId)).emit('student:update', { type: 'application' });
        }
        if (r.ok && r.companyId) companyIds.add(String(r.companyId));
      }
      for (const cid of companyIds) {
        io.to(`company:${cid}`).emit('company:update', { type: 'applications' });
        io.to(`company:${cid}`).emit('company:update', { type: 'internships' });
      }
      emitPlacementsUpdate(req);
    }

    res.json({ results });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
