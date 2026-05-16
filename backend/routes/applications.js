const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Application = require('../models/Application');
const Internship = require('../models/internship');
const Company = require('../models/Company');
const Setting = require('../models/Setting');
const User = require('../models/User');
const Student = require('../models/Student');
const auth = require('../middleware/auth');
const {
  refundApplicationSlot,
  syncStudentShortlisted,
  applyAllocationEffects,
} = require('../lib/allocation');
const {
  focalVisibleApplicationFilter,
  isHiddenFromCompanyFocal,
} = require('../lib/focalApplications');

const router = express.Router();

const KEY_APPLICATION_DEADLINE = 'globalApplicationDeadline';

async function getGlobalApplicationDeadlineDate() {
  const doc = await Setting.findOne({ key: KEY_APPLICATION_DEADLINE }).lean();
  if (!doc?.value) return null;
  const d = new Date(doc.value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function normalizeApplication(doc) {
  const o = doc.toObject ? doc.toObject() : doc;
  const intern = o.internshipId;
  const internshipId = intern && intern._id != null ? String(intern._id) : String(o.internshipId || '');
  const applied = o.appliedDate;
  const studentUserId =
    o.studentUser && o.studentUser._id != null ? String(o.studentUser._id) : String(o.studentUser || '');
  const companyId = o.company && o.company._id != null ? String(o.company._id) : String(o.company || '');
  // Get CGPA from populated studentUser or student data
  const studentCGPA = o.studentUser?.cgpa ?? o.studentCGPA ?? null;
  return {
    id: String(o._id),
    studentId: studentUserId, // legacy field name used by frontend
    studentName: o.studentName,
    internshipId,
    internshipTitle: o.internshipTitle,
    companyName: o.companyName,
    companyId,
    status: o.status,
    appliedDate: applied instanceof Date ? applied.toISOString().slice(0, 10) : String(applied || '').slice(0, 10),
    remarks: o.remarks,
    studentCGPA: studentCGPA ? Number(studentCGPA).toFixed(2) : null,
    isReplacement: Boolean(o.isReplacement),
  };
}

async function loadUserCompanyFromToken(req) {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const u = await User.findById(decoded.user.id);
    if (!u || !['company_focal', 'industrial_supervisor'].includes(u.role) || !u.companyId) return null;
    return { user: u, companyId: u.companyId };
  } catch {
    return null;
  }
}

async function applicationBelongsToCompany(applicationId, companyId) {
  const app = await Application.findById(applicationId).populate({
    path: 'internshipId',
    select: 'company',
  });
  if (!app || !app.internshipId) return false;
  const ic = app.internshipId.company;
  const cid = ic && ic.toString ? ic.toString() : String(ic);
  return cid === companyId.toString();
}

// @route   GET /api/applications/student/me
// @desc    Get applications for the logged-in student
router.get('/student/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'student') {
      return res.status(403).json({ msg: 'Only students can access their applications' });
    }

    const applications = await Application.find({ studentUser: user._id })
      .populate({ path: 'internshipId', select: 'title company location duration' })
      .sort({ appliedDate: -1 });
    
    res.json(applications.map(normalizeApplication));
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/applications/company/me
// @desc    Applications for internships posted by the logged-in focal/supervisor's company
router.get('/company/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !['company_focal', 'industrial_supervisor'].includes(user.role)) {
      return res.status(403).json({ msg: 'Not allowed' });
    }
    if (!user.companyId) {
      return res.json([]);
    }
    const internships = await Internship.find({ company: user.companyId }).select('_id').lean();
    const ids = internships.map((i) => i._id);
    const applications = await Application.find({
      internshipId: { $in: ids },
      ...focalVisibleApplicationFilter(),
    })
      .populate('internshipId')
      .populate({ path: 'studentUser', select: 'cgpa' })
      .sort({ appliedDate: -1 });
    res.json(applications.map(normalizeApplication));
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/applications
// @desc    Get all applications
router.get('/', async (req, res) => {
  try {
    const applications = await Application.find().populate('internshipId');
    res.json(applications);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/applications/:id
// @desc    Get application by ID
router.get('/:id', async (req, res) => {
  try {
    const application = await Application.findById(req.params.id).populate('internshipId');
    if (!application) {
      return res.status(404).json({ msg: 'Application not found' });
    }
    res.json(application);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/applications
// @desc    Create an application (authenticated student)
router.post('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'student') {
      return res.status(403).json({ msg: 'Only students can apply' });
    }

    const { internshipId, internshipTitle, companyName, remarks } = req.body;

    const globalDeadline = await getGlobalApplicationDeadlineDate();
    if (globalDeadline && Date.now() > globalDeadline.getTime()) {
      return res.status(400).json({ msg: 'Application deadline has passed for this cycle' });
    }

    if (!mongoose.Types.ObjectId.isValid(internshipId)) {
      return res.status(400).json({ msg: 'Invalid internship' });
    }

    const stud = await Student.findOne({ user: user._id });
    const maxApp = stud?.maxApplications ?? 2;
    if (stud && (stud.applicationCount || 0) >= maxApp) {
      return res.status(400).json({ msg: 'Application limit reached for this cycle' });
    }

    const intern = await Internship.findById(internshipId).populate('company');
    if (!intern || intern.status !== 'open') {
      return res.status(400).json({ msg: 'This internship is not accepting applications' });
    }

    const companyId = intern.company?._id || intern.company;
    const company = companyId ? await Company.findById(companyId).select('isActive').lean() : null;
    if (!company) {
      return res.status(400).json({ msg: 'Company not found for this internship' });
    }
    if (company.isActive === false) {
      return res.status(400).json({ msg: 'This company is not accepting applications' });
    }

    const dup = await Application.findOne({ studentUser: user._id, internshipId });
    if (dup) {
      return res.status(400).json({ msg: 'You have already applied for this internship' });
    }

    const application = new Application({
      studentUser: user._id,
      studentName: user.name,
      internshipId,
      internshipTitle: internshipTitle || intern.title,
      company: intern.company?._id || intern.company,
      companyName: companyName || (intern.company && intern.company.name) || '',
      status: 'pending',
      remarks: remarks || undefined,
    });
    await application.save();

    await Internship.findByIdAndUpdate(internshipId, { $inc: { applicationsCount: 1 } });

    if (stud) {
      stud.applicationCount = (stud.applicationCount || 0) + 1;
      if (stud.currentStatus === 'not_applied') stud.currentStatus = 'applied';
      await stud.save();
    }

    const populated = await Application.findById(application._id).populate('internshipId');
    res.json(normalizeApplication(populated));
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT /api/applications/:id
// @desc    Update application
router.put('/:id', async (req, res) => {
  try {
    const scope = await loadUserCompanyFromToken(req);
    const prev = await Application.findById(req.params.id);
    if (!prev) {
      return res.status(404).json({ msg: 'Application not found' });
    }

    if (scope) {
      const ok = await applicationBelongsToCompany(req.params.id, scope.companyId);
      if (!ok) {
        return res.status(403).json({ msg: 'Cannot modify this application' });
      }
      if (isHiddenFromCompanyFocal(prev)) {
        return res.status(403).json({ msg: 'This application is not available for company review' });
      }
    }

    if (prev.status !== 'allocated' && req.body.status === 'allocated') {
      const intern = await Internship.findById(prev.internshipId);
      if (intern && (intern.seatsFilled || 0) >= intern.seats) {
        return res.status(400).json({ msg: 'No seats remaining on this internship' });
      }
    }

    const application = await Application.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    }).populate({ path: 'internshipId', select: 'company title' });

    const terminalLossStatuses = ['rejected', 'exhaust'];
    if (!terminalLossStatuses.includes(prev.status) && terminalLossStatuses.includes(application.status)) {
      await refundApplicationSlot(application.studentUser, prev);
    }

    if (application.status === 'shortlisted' && prev.status !== 'shortlisted') {
      await syncStudentShortlisted(application);
    }

    if (prev.status !== 'allocated' && application.status === 'allocated') {
      const { ok, reason } = await applyAllocationEffects(application._id);
      if (!ok && reason === 'no_seats') {
        await Application.findByIdAndUpdate(application._id, { status: prev.status });
        return res.status(400).json({ msg: 'No seats remaining on this internship' });
      }
    }

    const io = req.app.get('io');
    if (io) {
      io.to(String(application.studentUser)).emit('student:update', { type: 'application' });
      const intern = application.internshipId;
      const cid = intern?.company?.toString?.();
      if (cid) {
        io.to(`company:${cid}`).emit('company:update', { type: 'applications' });
        io.to(`company:${cid}`).emit('company:update', { type: 'internships' });
        
        // Notify academic supervisor assigned to this company about student allocation changes
        if (['allocated', 'shortlisted'].includes(application.status)) {
          const company = await Company.findById(cid).select('assignedSupervisor').lean();
          if (company?.assignedSupervisor) {
            io.to(String(company.assignedSupervisor)).emit('supervisor:update', { type: 'students' });
          }
        }
        io.to('placements').emit('placements:update', { type: 'vacancies' });
      }
    }

    res.json(normalizeApplication(application));
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE /api/applications/:id
// @desc    Delete application
router.delete('/:id', async (req, res) => {
  try {
    const application = await Application.findByIdAndDelete(req.params.id);
    if (!application) {
      return res.status(404).json({ msg: 'Application not found' });
    }
    res.json({ msg: 'Application deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
