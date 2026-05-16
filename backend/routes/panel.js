const express = require('express');
const mongoose = require('mongoose');
const Student = require('../models/Student');
const User = require('../models/User');
const Application = require('../models/Application');
const Company = require('../models/Company');
const Evaluation = require('../models/Evaluation');
const FinalGrade = require('../models/FinalGrade');
const ProgressReport = require('../models/ProgressReport');
const auth = require('../middleware/auth');
const { getIndustrialMarkingStats, getIndustrialMonthlyBreakdown, getStudentAllocatedCompanyId } = require('../lib/industrialMarking');
const { serializeFinalGrade, getContributionList } = require('../lib/serializeFinalGrade');
const { aggregateFromContributions } = require('../lib/finalGradeAggregate');
const { upsertInternalFinalContribution } = require('../lib/upsertFinalGradeContribution');

const router = express.Router();

/** Same cohort as placements: allocated on Student record OR allocated application (doc can lag). */
async function collectInternshipAllocatedUserIds() {
  const appIds = await Application.distinct('studentUser', { status: 'allocated' });
  const fromDoc = await Student.find({ currentStatus: 'allocated' }).select('user').lean();
  const uniq = new Set([...appIds.map((id) => String(id)), ...fromDoc.map((r) => String(r.user))]);
  return [...uniq]
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));
}

function internalTotalFromFinalGradeDoc(doc) {
  if (!doc) return 0;
  const contributions = getContributionList(doc);
  if (!contributions.length) return 0;
  return Number(aggregateFromContributions(contributions).internalTotal.toFixed(2));
}

async function hasAllocatedInternship(studentUserId) {
  const sid =
    mongoose.Types.ObjectId.isValid(studentUserId) ? new mongoose.Types.ObjectId(studentUserId) : null;
  if (!sid) return false;
  const st = await Student.findOne({ user: sid }).select('currentStatus').lean();
  if (st?.currentStatus === 'allocated') return true;
  const app = await Application.findOne({ studentUser: sid, status: 'allocated' }).select('_id').lean();
  return !!app;
}

function normalizeStudent(doc) {
  const s = doc.toObject ? doc.toObject() : doc;
  const u = s.user;
  const allocatedCompanyId =
    s.allocatedCompany && s.allocatedCompany._id ? String(s.allocatedCompany._id) : s.allocatedCompany ? String(s.allocatedCompany) : undefined;
  return {
    id: u && u._id ? String(u._id) : String(s.user),
    name: u?.name || '',
    email: u?.email || '',
    role: 'student',
    department: u?.department,
    studentId: s.studentId,
    cgpa: s.cgpa,
    specialization: s.specialization,
    applicationCount: s.applicationCount,
    maxApplications: s.maxApplications,
    currentStatus: s.currentStatus,
    allocatedCompany: s.allocatedCompany?.name || allocatedCompanyId,
    allocatedCompanyId,
  };
}

// @route   GET /api/panel/students
// @desc    Get internship-allocated students for evaluation panel (aligned with supervisor final grading scope)
router.get('/students', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'evaluation_panel') {
      return res.status(403).json({ msg: 'Not allowed' });
    }

    // Allocation source of truth for panel listing
    const applications = await Application.find({ status: 'allocated' })
      .select('studentUser company companyName status')
      .lean();

    if (applications.length === 0) {
      return res.json([]);
    }

    const appByUserId = new Map();
    for (const app of applications) {
      const uid = String(app.studentUser || '');
      if (!uid || appByUserId.has(uid)) continue;
      appByUserId.set(uid, app);
    }

    const validIds = [...appByUserId.keys()]
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    if (validIds.length === 0) {
      return res.json([]);
    }

    const users = await User.find({ _id: { $in: validIds }, role: 'student' }).select('-password');
    const studentRows = await Student.find({ user: { $in: validIds } })
      .select('user studentId cgpa specialization currentStatus allocatedCompany')
      .lean();
    const studentByUserId = new Map(studentRows.map((s) => [String(s.user), s]));

    const gradeRows = await FinalGrade.find({ studentUser: { $in: validIds } })
      .sort({ submittedAt: -1 })
      .lean();
    const gradeByUserId = new Map();
    for (const g of gradeRows) {
      const id = String(g.studentUser || '');
      if (id && !gradeByUserId.has(id)) gradeByUserId.set(id, g);
    }

    const enriched = [];
    for (const u of users) {
      const uid = String(u._id);
      const app = appByUserId.get(uid);
      const sRow = studentByUserId.get(uid) || {};
      const cid = app?.company ? String(app.company) : await getStudentAllocatedCompanyId(uid);
      const stats = await getIndustrialMarkingStats(uid, cid);
      const monthly = await getIndustrialMonthlyBreakdown(uid, cid);
      const internalFromGrade = internalTotalFromFinalGradeDoc(gradeByUserId.get(uid));
      const progressOutOf100 = Math.min(100, Number((stats.externalOutOf50 + internalFromGrade).toFixed(2)));

      enriched.push({
        id: uid,
        name: u.name,
        email: u.email,
        role: 'student',
        department: u.department,
        studentId: sRow.studentId || u.studentId || '',
        cgpa: Number(sRow.cgpa || u.cgpa || 0),
        specialization: sRow.specialization || '',
        applicationCount: sRow.applicationCount || 0,
        maxApplications: sRow.maxApplications || 2,
        currentStatus: app?.status || sRow.currentStatus || 'allocated',
        allocatedCompany: app?.companyName || '',
        allocatedCompanyId: app?.company ? String(app.company) : '',
        industrialMonthsCompleted: stats.monthsCompleted,
        industrialExternalTotal: stats.externalOutOf50,
        industrialMonthlyEvaluations: monthly,
        internalTotalFromGrade: internalFromGrade,
        progressOutOf100,
        totalScore: stats.externalOutOf50,
        industrialMarkingComplete: stats.complete,
      });
    }

    enriched.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    res.json(enriched);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/panel/evaluations
// @desc    Get all evaluations for evaluation panel
router.get('/evaluations', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'evaluation_panel') {
      return res.status(403).json({ msg: 'Not allowed' });
    }

    const students = await Student.find({ currentStatus: 'allocated' }).select('user');
    const studentUserIds = students.map(s => String(s.user));

    const evaluations = await Evaluation.find({
      studentUser: { $in: studentUserIds },
    }).sort({ createdAt: -1 });

    const normalizedEvaluations = evaluations.map(e => {
      const obj = e.toObject ? e.toObject() : e;
      return {
        id: String(obj._id),
        studentId: String(obj.studentUser),
        studentName: obj.studentName,
        evaluatorId: String(obj.evaluatorUser),
        evaluatorName: obj.evaluatorName,
        type: obj.type,
        month: obj.month || '',
        score: obj.score,
        maxScore: obj.maxScore,
        remarks: obj.remarks,
        date: obj.date ? new Date(obj.date).toISOString().split('T')[0] : '',
      };
    });

    res.json(normalizedEvaluations);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/panel/final-grades
// @desc    Get final grades for all allocated students (panel view)
router.get('/final-grades', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'evaluation_panel') {
      return res.status(403).json({ msg: 'Not allowed' });
    }

    const studentOids = await collectInternshipAllocatedUserIds();
    const studentUserIds = studentOids.map((id) => String(id));

    const grades = await FinalGrade.find({
      studentUser: { $in: studentUserIds },
    }).sort({ submittedAt: -1 });

    const out = [];
    for (const g of grades) {
      const cid = await getStudentAllocatedCompanyId(g.studentUser);
      const stats = await getIndustrialMarkingStats(g.studentUser, cid);
      out.push(serializeFinalGrade(g, stats));
    }

    res.json(out);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/panel/final-grades
// @desc    Submit final grade for a student (panel member)
router.post('/final-grades', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'evaluation_panel') {
      return res.status(403).json({ msg: 'Not allowed' });
    }

    const {
      studentId,
      content,
      visuals,
      presentationSkills,
      organization,
      handlingOfQuestions,
      modernToolUsage,
      ethics,
      reportScore,
      remarks,
    } = req.body;

    const hoq = Number(handlingOfQuestions);
    const modern = Number(modernToolUsage);
    const ethicsScore = Number(ethics);
    if (!Number.isFinite(hoq) || hoq < 0 || hoq > 20) {
      return res.status(400).json({ msg: 'Handling of Questions must be between 0 and 20.' });
    }
    if (!Number.isFinite(modern) || modern < 0 || modern > 5) {
      return res.status(400).json({ msg: 'Modern Tool Usage must be between 0 and 5.' });
    }
    if (!Number.isFinite(ethicsScore) || ethicsScore < 0 || ethicsScore > 5) {
      return res.status(400).json({ msg: 'Ethics must be between 0 and 5.' });
    }

    const studentUser = await User.findById(studentId).select('name role').lean();
    if (!studentUser || studentUser.role !== 'student' || !(await hasAllocatedInternship(studentId))) {
      return res.status(403).json({ msg: 'Student not allocated or not found' });
    }

    const student = await Student.findOne({
      user: studentId,
    })
      .populate({
        path: 'academicSupervisor',
        select: 'name',
      })
      .lean();

    const companyId = await getStudentAllocatedCompanyId(studentId);
    const industrial = await getIndustrialMarkingStats(studentId, companyId);
    if (!industrial.complete) {
      return res.status(400).json({
        msg: 'Industrial supervisor must complete all 4 monthly evaluations before final internal grading.',
      });
    }

    let supervisorOwnerId = req.user.id;
    let supervisorOwnerName = user.name;
    if (student?.academicSupervisor) {
      const ac = student.academicSupervisor;
      if (ac && typeof ac === 'object' && ac.name) {
        supervisorOwnerId = ac._id;
        supervisorOwnerName = ac.name;
      } else {
        const oid = ac._id || ac;
        const acUser = mongoose.Types.ObjectId.isValid(String(oid)) ? await User.findById(oid).select('name') : null;
        if (acUser) {
          supervisorOwnerId = oid;
          supervisorOwnerName = acUser.name || supervisorOwnerName;
        }
      }
    }

    const finalGrade = await upsertInternalFinalContribution({
      studentId,
      studentName: studentUser.name || '',
      supervisorOwnerUserId: supervisorOwnerId,
      supervisorOwnerName: supervisorOwnerName,
      evaluatorUserId: req.user.id,
      evaluatorName: user.name,
      evaluatorRole: 'evaluation_panel',
      marks: {
        content,
        visuals,
        presentationSkills,
        organization,
        handlingOfQuestions: hoq,
        modernToolUsage: modern,
        ethics: ethicsScore,
        reportScore,
      },
      remarks,
      industrialStats: industrial,
    });

    // Notify student via socket
    const io = req.app.get('io');
    if (io) {
      io.to(String(studentId)).emit('student:update', { type: 'final-grades' });
      io.emit('panel:update', { type: 'final-grades' });
    }

    const cid = await getStudentAllocatedCompanyId(studentId);
    const statsOut = await getIndustrialMarkingStats(studentId, cid);
    res.json(serializeFinalGrade(finalGrade, statsOut));
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/panel/progress-reports
// @desc    Get progress reports for all allocated students (panel view)
router.get('/progress-reports', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'evaluation_panel') {
      return res.status(403).json({ msg: 'Not allowed' });
    }

    const students = await Student.find({ currentStatus: 'allocated' }).select('user');
    const studentUserIds = students.map(s => String(s.user));

    const reports = await ProgressReport.find({
      studentUser: { $in: studentUserIds },
    }).sort({ submittedDate: -1 });

    res.json(reports);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
