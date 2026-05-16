const express = require('express');
const mongoose = require('mongoose');
const Student = require('../models/Student');
const User = require('../models/User');
const Company = require('../models/Company');
const Evaluation = require('../models/Evaluation');
const ProgressReport = require('../models/ProgressReport');
const FinalGrade = require('../models/FinalGrade');
const Feedback = require('../models/Feedback');
const Application = require('../models/Application');
const auth = require('../middleware/auth');
const {
  getIndustrialMarkingStats,
  getStudentAllocatedCompanyId,
  getIndustrialEvaluatorIdsForCompany,
} = require('../lib/industrialMarking');
const { serializeFinalGrade } = require('../lib/serializeFinalGrade');
const { upsertInternalFinalContribution } = require('../lib/upsertFinalGradeContribution');

const router = express.Router();

async function collectInternshipAllocatedUserIds() {
  const appIds = await Application.distinct('studentUser', { status: 'allocated' });
  const fromDoc = await Student.find({ currentStatus: 'allocated' }).select('user').lean();
  const uniq = new Set([...appIds.map((id) => String(id)), ...fromDoc.map((r) => String(r.user))]);
  return [...uniq]
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));
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
  const shortlistedCompanyId =
    s.shortlistedCompany && s.shortlistedCompany._id ? String(s.shortlistedCompany._id) : s.shortlistedCompany ? String(s.shortlistedCompany) : undefined;
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
    shortlistedCompany: s.shortlistedCompany?.name || shortlistedCompanyId,
    shortlistedCompanyId,
  };
}

// @route   GET /api/supervisor/students
// @desc    Get students assigned to this academic supervisor
//          Includes: 1) Students with academicSupervisor field set to this user
//                    2) Students with applications to companies assigned to this supervisor
router.get('/students', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'academic_supervisor') {
      return res.status(403).json({ msg: 'Not allowed' });
    }

    // Only companies assigned to this academic supervisor by focal side.
    const assignedCompanies = await Company.find({ assignedSupervisor: req.user.id }).select('_id name');

    let applications = [];
    if (assignedCompanies.length > 0) {
      const companyIds = assignedCompanies.map((c) => c._id);
      applications = await Application.find({
        company: { $in: companyIds },
        status: { $in: ['shortlisted', 'allocated'] },
      }).select('studentUser company status studentName companyName').lean();
    }

  const APP_STATUS_RANK = { allocated: 3, shortlisted: 2, pending: 1 };

    // Prefer allocated placement over an older shortlisted row at another company
    const studentMap = new Map();
    for (const app of applications) {
      const userId = String(app.studentUser);
      const entry = {
        userId,
        companyId: app.company,
        companyName: app.companyName,
        status: app.status,
      };
      const existing = studentMap.get(userId);
      const rank = APP_STATUS_RANK[app.status] || 0;
      const existingRank = existing ? APP_STATUS_RANK[existing.status] || 0 : -1;
      if (!existing || rank > existingRank) {
        studentMap.set(userId, entry);
      }
    }

    const studentUserIds = [...studentMap.keys()];

    // Query User model
    let students = [];
    if (studentUserIds.length > 0) {
      const validIds = studentUserIds
        .filter(id => mongoose.Types.ObjectId.isValid(id))
        .map(id => new mongoose.Types.ObjectId(id));
      
      const users = await User.find({ 
        _id: { $in: validIds },
        role: 'student'
      }).select('-password');
      
      const studentObjectIds = users.map(u => u._id);
      const studentRows = await Student.find({ user: { $in: studentObjectIds } })
        .select('user allocatedCompany')
        .lean();
      const allocatedCompanyByUser = new Map(
        studentRows.map((s) => [String(s.user), s.allocatedCompany ? String(s.allocatedCompany) : null])
      );

      students = [];
      for (const u of users) {
        const appInfo = studentMap.get(String(u._id));
        const companyFromProfile = allocatedCompanyByUser.get(String(u._id));
        const companyId =
          companyFromProfile ||
          (appInfo?.status === 'allocated' && appInfo?.companyId ? String(appInfo.companyId) : null) ||
          (await getStudentAllocatedCompanyId(u._id));
        const stats = await getIndustrialMarkingStats(u._id, companyId);
        const totalMonths = 4;
        const totalWeightage = 50;
        const progress =
          totalWeightage > 0 ? Math.min(100, Math.round((stats.externalOutOf50 / totalWeightage) * 100)) : 0;

        students.push({
          id: String(u._id),
          name: u.name,
          email: u.email,
          role: 'student',
          department: u.department,
          studentId: u.studentId || '',
          cgpa: u.cgpa || 0,
          specialization: u.specialization || '',
          currentStatus: appInfo?.status || 'allocated',
          allocatedCompany: appInfo?.companyName || '',
          allocatedCompanyId: companyId || (appInfo?.companyId ? String(appInfo.companyId) : ''),
          progress,
          totalScore: stats.externalOutOf50,
          industrialExternalTotal: stats.externalOutOf50,
          monthsCompleted: stats.monthsCompleted,
          totalMonths,
          totalWeightage,
          industrialMarkingComplete: stats.complete,
        });
      }
    }

    res.json(students);
  } catch (err) {
    console.error('[Supervisor Students] Error:', err.message);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// @route   GET /api/supervisor/final-grading-students
// @desc    Full-batch final grading cohort: only students with completed industrial 4-month marking
router.get('/final-grading-students', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'academic_supervisor') {
      return res.status(403).json({ msg: 'Not allowed' });
    }

    const applications = await Application.find({ status: 'allocated' })
      .select('studentUser company companyName status')
      .lean();

    const appByUserId = new Map();
    const rank = { allocated: 3, shortlisted: 2, pending: 1 };
    for (const app of applications) {
      const uid = String(app.studentUser || '');
      if (!uid) continue;
      const existing = appByUserId.get(uid);
      if (!existing || (rank[app.status] || 0) > (rank[existing.status] || 0)) {
        appByUserId.set(uid, app);
      }
    }

    const validIds = [...appByUserId.keys()]
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    if (validIds.length === 0) {
      return res.json([]);
    }

    const users = await User.find({ _id: { $in: validIds }, role: 'student' }).select('-password');
    const studentRows = await Student.find({ user: { $in: validIds } })
      .select('user studentId cgpa specialization allocatedCompany')
      .lean();
    const studentByUserId = new Map(studentRows.map((s) => [String(s.user), s]));

    const out = [];
    for (const u of users) {
      const uid = String(u._id);
      const app = appByUserId.get(uid);
      const sRow = studentByUserId.get(uid) || {};
      const cid = app?.company ? String(app.company) : await getStudentAllocatedCompanyId(uid);
      const stats = await getIndustrialMarkingStats(uid, cid);
      if (!stats.complete) continue;

      out.push({
        id: uid,
        name: u.name,
        email: u.email,
        role: 'student',
        department: u.department,
        studentId: sRow.studentId || u.studentId || '',
        cgpa: Number(sRow.cgpa || u.cgpa || 0),
        specialization: sRow.specialization || '',
        currentStatus: app?.status || 'allocated',
        allocatedCompany: app?.companyName || '',
        allocatedCompanyId: app?.company ? String(app.company) : '',
        progress: Number(((stats.externalOutOf50 / 50) * 100).toFixed(2)),
        totalScore: stats.externalOutOf50,
        industrialExternalTotal: stats.externalOutOf50,
        monthsCompleted: stats.monthsCompleted,
        totalMonths: 4,
        totalWeightage: 50,
        industrialMarkingComplete: true,
      });
    }

    out.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    res.json(out);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/supervisor/evaluations
// @desc    Get evaluations for this supervisor's students
router.get('/evaluations', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'academic_supervisor') {
      return res.status(403).json({ msg: 'Not allowed' });
    }

    const students = await Student.find({ academicSupervisor: req.user.id }).select('user');
    const studentUserIds = students.map(s => String(s.user));

    const evaluations = await Evaluation.find({
      studentId: { $in: studentUserIds },
    }).sort({ createdAt: -1 });

    res.json(evaluations);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/supervisor/evaluations
// @desc    Submit evaluation for a student
router.post('/evaluations', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'academic_supervisor') {
      return res.status(403).json({ msg: 'Not allowed' });
    }

    const { studentId, month, scores, remarks } = req.body;

    // Verify student belongs to this supervisor
    const student = await Student.findOne({
      user: studentId,
      academicSupervisor: req.user.id,
    });
    if (!student) {
      return res.status(403).json({ msg: 'Student not assigned to you' });
    }

    const evaluation = new Evaluation({
      studentId,
      supervisorId: req.user.id,
      month,
      scores,
      remarks,
      submittedAt: new Date(),
    });

    await evaluation.save();

    const io = req.app.get('io');
    if (io) {
      io.to(String(studentId)).emit('student:update', { type: 'evaluations' });
    }

    res.json(evaluation);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/supervisor/list
// @desc    Get all academic supervisors (for admin/focal to assign students)
router.get('/list', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !['admin', 'manager_placements', 'university_focal'].includes(user.role)) {
      return res.status(403).json({ msg: 'Not allowed' });
    }

    const supervisors = await User.find({ role: 'academic_supervisor' })
      .select('name email department')
      .sort({ name: 1 });

    res.json(supervisors);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT /api/supervisor/assign/:studentId
// @desc    Assign academic supervisor to a student
router.put('/assign/:studentId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !['admin', 'manager_placements', 'university_focal'].includes(user.role)) {
      return res.status(403).json({ msg: 'Not allowed' });
    }

    const { supervisorId } = req.body;
    const { studentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ msg: 'Invalid student ID' });
    }

    // Verify supervisor exists and is academic_supervisor
    if (supervisorId) {
      const supervisor = await User.findOne({
        _id: supervisorId,
        role: 'academic_supervisor',
      });
      if (!supervisor) {
        return res.status(400).json({ msg: 'Invalid academic supervisor' });
      }
    }

    const student = await Student.findOneAndUpdate(
      { user: studentId },
      { academicSupervisor: supervisorId || null },
      { new: true }
    )
      .populate('user')
      .populate('allocatedCompany', 'name');

    if (!student) {
      return res.status(404).json({ msg: 'Student not found' });
    }

    // Notify supervisor via socket
    const io = req.app.get('io');
    if (io && supervisorId) {
      io.to(String(supervisorId)).emit('supervisor:update', { type: 'students' });
    }

    res.json(normalizeStudent(student));
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/supervisor/all-students
// @desc    Get all students with their academic supervisor info (for admin/focal)
router.get('/all-students', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !['admin', 'manager_placements', 'university_focal'].includes(user.role)) {
      return res.status(403).json({ msg: 'Not allowed' });
    }

    const students = await Student.find()
      .populate('user')
      .populate('allocatedCompany', 'name')
      .populate('shortlistedCompany', 'name')
      .populate('academicSupervisor', 'name email')
      .sort({ studentId: 1 });

    const normalizedFromStudents = students.filter((s) => s.user).map((s) => {
      const base = normalizeStudent(s);
      const doc = s.toObject ? s.toObject() : s;
      return {
        ...base,
        shortlistedCompanyName:
          (doc.shortlistedCompany && doc.shortlistedCompany.name) ||
          (typeof base.shortlistedCompany === 'string' ? base.shortlistedCompany : ''),
        academicSupervisorId: doc.academicSupervisor?._id
          ? String(doc.academicSupervisor._id)
          : (doc.academicSupervisor ? String(doc.academicSupervisor) : undefined),
        academicSupervisorName: doc.academicSupervisor?.name || undefined,
      };
    });

    // Also include accepted applicants even if Student profile row is missing/outdated.
    const acceptedApplications = await Application.find({
      status: { $in: ['shortlisted', 'allocated'] },
    })
      .select('studentUser studentName company companyName status')
      .lean();

    const appMap = new Map();
    for (const app of acceptedApplications) {
      const uid = String(app.studentUser || '');
      if (!uid) continue;
      const prev = appMap.get(uid);
      if (!prev || (prev.status !== 'allocated' && app.status === 'allocated')) {
        appMap.set(uid, app);
      }
    }

    const resultByUserId = new Map(normalizedFromStudents.map((row) => [String(row.id), row]));
    const missingUserIds = [...appMap.keys()].filter((uid) => !resultByUserId.has(uid));

    if (missingUserIds.length > 0) {
      const users = await User.find({
        _id: {
          $in: missingUserIds
            .filter((id) => mongoose.Types.ObjectId.isValid(id))
            .map((id) => new mongoose.Types.ObjectId(id)),
        },
        role: 'student',
      }).select('name email department studentId cgpa specialization');

      for (const u of users) {
        const uid = String(u._id);
        const app = appMap.get(uid);
        if (!app) continue;
        const isAllocated = app.status === 'allocated';
        resultByUserId.set(uid, {
          id: uid,
          name: u.name || app.studentName || '',
          email: u.email || '',
          role: 'student',
          department: u.department,
          studentId: u.studentId || '',
          cgpa: typeof u.cgpa === 'number' ? u.cgpa : 0,
          specialization: u.specialization || '',
          applicationCount: 0,
          maxApplications: 2,
          currentStatus: isAllocated ? 'allocated' : 'shortlisted',
          allocatedCompany: isAllocated ? app.companyName : '',
          allocatedCompanyId: isAllocated ? String(app.company || '') : undefined,
          shortlistedCompany: !isAllocated ? app.companyName : '',
          shortlistedCompanyName: !isAllocated ? app.companyName : '',
          shortlistedCompanyId: !isAllocated ? String(app.company || '') : undefined,
        });
      }
    }

    const result = [...resultByUserId.values()].sort((a, b) =>
      String(a.name || '').localeCompare(String(b.name || ''))
    );
    res.json(result);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/supervisor/progress-reports
// @desc    Get progress reports for this supervisor's students
router.get('/progress-reports', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'academic_supervisor') {
      return res.status(403).json({ msg: 'Not allowed' });
    }

    const { studentId, month } = req.query || {};
    const filterStudentId = studentId != null ? String(studentId) : '';
    const filterMonth = month != null ? String(month).trim() : '';

    const students = await Student.find({ academicSupervisor: req.user.id }).select('user');
    const studentUserIds = students.map(s => String(s.user));

    if (filterStudentId && !studentUserIds.includes(filterStudentId)) {
      return res.status(403).json({ msg: 'Student not assigned to you' });
    }

    const reports = await ProgressReport.find({
      studentUser: filterStudentId ? filterStudentId : { $in: studentUserIds },
      ...(filterMonth ? { month: filterMonth } : {}),
    }).sort({ submittedDate: -1 });

    res.json(reports);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/supervisor/monthly-evaluations
// @desc    Get industrial supervisor monthly evaluations for this supervisor's assigned students
//          Supports optional filters: ?studentId=<id>&month=<label>
router.get('/monthly-evaluations', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'academic_supervisor') {
      return res.status(403).json({ msg: 'Not allowed' });
    }

    const { studentId, month } = req.query || {};
    const filterStudentId = studentId != null ? String(studentId) : '';
    const filterMonth = month != null ? String(month).trim() : '';

    // Include both:
    // 1) Students explicitly assigned to this academic supervisor
    // 2) Students who applied to companies assigned to this academic supervisor (shortlisted/allocated)
    const assignedCompanies = await Company.find({ assignedSupervisor: req.user.id }).select('_id');
    const companyIds = assignedCompanies.map((c) => c._id);

    let studentUserIds = [];
    const direct = await Student.find({ academicSupervisor: req.user.id }).select('user').lean();
    studentUserIds.push(...direct.map((s) => String(s.user)));

    if (companyIds.length > 0) {
      const apps = await Application.find({
        company: { $in: companyIds },
        status: { $in: ['shortlisted', 'allocated'] },
      })
        .select('studentUser')
        .lean();
      studentUserIds.push(...apps.map((a) => String(a.studentUser)));
    }

    studentUserIds = [...new Set(studentUserIds)].filter(Boolean);

    if (filterStudentId && !studentUserIds.includes(filterStudentId)) {
      return res.status(403).json({ msg: 'Student not assigned to you' });
    }

    const query = {
      studentUser: filterStudentId ? filterStudentId : { $in: studentUserIds },
      type: 'monthly',
      ...(filterMonth ? { month: filterMonth } : {}),
    };

    const evaluations = await Evaluation.find(query)
      .select('studentUser studentName evaluatorUser evaluatorName month score maxScore remarks date createdAt')
      .sort({ date: -1, createdAt: -1 })
      .lean();

    const uniqueStudentIds = [
      ...new Set(evaluations.map((e) => (e.studentUser ? String(e.studentUser) : '')).filter(Boolean)),
    ];
    const companyByStudent = new Map();
    for (const uid of uniqueStudentIds) {
      const cid = await getStudentAllocatedCompanyId(uid);
      if (cid) companyByStudent.set(uid, cid);
    }

    const evaluatorIdsByCompany = new Map();
    const scopedEvaluations = [];
    for (const e of evaluations) {
      const uid = e.studentUser ? String(e.studentUser) : '';
      const cid = companyByStudent.get(uid);
      if (!cid) continue;
      if (!evaluatorIdsByCompany.has(cid)) {
        const ids = await getIndustrialEvaluatorIdsForCompany(cid);
        evaluatorIdsByCompany.set(cid, new Set(ids.map((id) => String(id))));
      }
      const allowed = evaluatorIdsByCompany.get(cid);
      if (allowed.has(String(e.evaluatorUser || ''))) {
        scopedEvaluations.push(e);
      }
    }

    const normalized = scopedEvaluations.map((e) => {
      const score = Number(e.score || 0);
      const maxScore = Number(e.maxScore || 80);
      const ratio = maxScore > 0 ? Math.max(0, Math.min(1, score / maxScore)) : 0;
      const marksOutOf12_5 = ratio * 12.5;
      return {
        id: String(e._id),
        studentId: e.studentUser ? String(e.studentUser) : '',
        studentName: e.studentName || '',
        evaluatorName: e.evaluatorName || '',
        month: String(e.month || ''),
        marksOutOf12_5,
        remarks: e.remarks || '',
        date: e.date instanceof Date ? e.date.toISOString().slice(0, 10) : String(e.date || '').slice(0, 10),
      };
    });

    res.json(normalized);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT /api/supervisor/progress-reports/:reportId
// @desc    Update progress report status and add academic remarks
router.put('/progress-reports/:reportId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'academic_supervisor') {
      return res.status(403).json({ msg: 'Not allowed' });
    }

    const { reportId } = req.params;
    const { status, academicRemarks } = req.body;

    if (!mongoose.Types.ObjectId.isValid(reportId)) {
      return res.status(400).json({ msg: 'Invalid report ID' });
    }

    // Get the report
    const report = await ProgressReport.findById(reportId);
    if (!report) {
      return res.status(404).json({ msg: 'Progress report not found' });
    }

    // Verify the student belongs to this supervisor
    const student = await Student.findOne({
      user: report.studentUser,
      academicSupervisor: req.user.id,
    });
    if (!student) {
      return res.status(403).json({ msg: 'Student not assigned to you' });
    }

    // Update report
    report.status = status || report.status;
    if (academicRemarks !== undefined) {
      report.academicRemarks = academicRemarks;
    }
    await report.save();

    // Notify student via socket
    const io = req.app.get('io');
    if (io) {
      io.to(String(report.studentUser)).emit('student:update', { type: 'progress-reports' });
    }

    res.json(report);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/supervisor/final-grades
// @desc    Get final grades for this supervisor's students
router.get('/final-grades', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'academic_supervisor') {
      return res.status(403).json({ msg: 'Not allowed' });
    }

    const scopeIds = (await collectInternshipAllocatedUserIds()).map((id) => String(id));

    const grades = await FinalGrade.find({
      studentUser: { $in: scopeIds },
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

// @route   POST /api/supervisor/final-grades
// @desc    Submit final grade for a student
router.post('/final-grades', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'academic_supervisor') {
      return res.status(403).json({ msg: 'Not allowed' });
    }

    const { studentId, content, visuals, presentationSkills, organization, handlingOfQuestions, reportScore, remarks } =
      req.body;

    if (!(await hasAllocatedInternship(studentId))) {
      return res.status(403).json({ msg: 'Student not allocated or not found' });
    }

    const studentUserDoc = await User.findById(studentId);
    if (!studentUserDoc || studentUserDoc.role !== 'student') {
      return res.status(400).json({ msg: 'Invalid student' });
    }

    const student = await Student.findOne({ user: studentId }).populate('user');
    const companyId = await getStudentAllocatedCompanyId(studentId);
    const industrial = await getIndustrialMarkingStats(studentId, companyId);
    if (!industrial.complete) {
      return res.status(400).json({
        msg: 'Industrial supervisor must complete all 4 monthly evaluations before final internal grading.',
      });
    }

    const ownerRow = student;
    let supervisorOwnerId = req.user.id;
    let supervisorOwnerName = user.name;
    if (ownerRow?.academicSupervisor) {
      const ac = await User.findById(ownerRow.academicSupervisor).select('name');
      if (ac) {
        supervisorOwnerId = ownerRow.academicSupervisor;
        supervisorOwnerName = ac.name || supervisorOwnerName;
      }
    }

    const finalGrade = await upsertInternalFinalContribution({
      studentId,
      studentName: student?.user?.name || studentUserDoc.name,
      supervisorOwnerUserId: supervisorOwnerId,
      supervisorOwnerName: supervisorOwnerName,
      evaluatorUserId: req.user.id,
      evaluatorName: user.name,
      evaluatorRole: 'academic_supervisor',
      marks: { content, visuals, presentationSkills, organization, handlingOfQuestions, reportScore },
      remarks,
      industrialStats: industrial,
    });

    // Notify student via socket
    const io = req.app.get('io');
    if (io) {
      io.to(String(studentId)).emit('student:update', { type: 'final-grades' });
      // University focal "Final Grading" listens on panel:update for final-grades changes.
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

// @route   GET /api/supervisor/final-grades/export
// @desc    Export all final grades for supervisor's students as CSV
router.get('/final-grades/export', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'academic_supervisor') {
      return res.status(403).json({ msg: 'Not allowed' });
    }

    const oidList = await collectInternshipAllocatedUserIds();
    const scopeUserIds = oidList.map((id) => String(id));

    const users = await User.find({ _id: { $in: oidList }, role: 'student' }).select('name studentId');
    const students = await Student.find({ user: { $in: oidList } })
      .populate('user')
      .populate('allocatedCompany', 'name');

    const grades = await FinalGrade.find({
      studentUser: { $in: scopeUserIds },
    });

    // Create CSV header
    const csvHeader =
      'Student Name,Student ID,Company,External (50),Internal evaluators,Avg Content (10),Avg Visuals (10),Avg Presentation Skills (10),Avg Organization (10),Avg Handling Questions (30),Avg Report (10),Internal Total avg (50),Grand Total (100),Grade,Remarks\n';

    const studentRowByUser = new Map(students.map((s) => [String(s.user._id || s.user), s]));

    // Create CSV rows
    const csvRows = [];
    for (const u of users) {
      const uid = String(u._id);
      const student = studentRowByUser.get(uid);
      const grade = grades.find((g) => String(g.studentUser) === uid);
      const companyName = student?.allocatedCompany?.name || 'N/A';
      const sid = student?.studentId || u.studentId || '';

      if (!grade) {
        csvRows.push(`${u.name || ''},${sid},${companyName},Not Graded,,,,,,,,,,`);
        continue;
      }

      const cid = await getStudentAllocatedCompanyId(uid);
      const stats = await getIndustrialMarkingStats(uid, cid);
      const serialized = serializeFinalGrade(grade, stats);
      const contrib = serialized.contributorCount || '';

      csvRows.push(
        `${serialized.studentName},${sid},${companyName},${serialized.externalTotal},${contrib},${serialized.content?.toFixed(2)},${serialized.visuals?.toFixed(2)},${serialized.presentationSkills?.toFixed(2)},${serialized.organization?.toFixed(2)},${serialized.handlingOfQuestions?.toFixed(2)},${serialized.reportScore?.toFixed(2)},${serialized.internalTotal.toFixed(2)},${serialized.grandTotal.toFixed(2)},${serialized.grade},"${(grade.remarks || '').replace(/"/g, '""')}"`
      );
    }

    const csvJoined = csvRows.join('\n');
    
    const csv = csvHeader + csvJoined;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="final-grades-${Date.now()}.csv"`);
    res.send(csv);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/supervisor/feedback
// @desc    Get feedback sent by this supervisor
router.get('/feedback', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'academic_supervisor') {
      return res.status(403).json({ msg: 'Not allowed' });
    }

    const feedback = await Feedback.find({ supervisorUser: req.user.id })
      .sort({ sentAt: -1 });

    res.json(feedback);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/supervisor/feedback
// @desc    Send feedback to a student
router.post('/feedback', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'academic_supervisor') {
      return res.status(403).json({ msg: 'Not allowed' });
    }

    const { studentId, type, message, month } = req.body;
    if (!studentId || !mongoose.Types.ObjectId.isValid(String(studentId))) {
      return res.status(400).json({ msg: 'Valid studentId is required' });
    }
    if (!type || typeof type !== 'string') {
      return res.status(400).json({ msg: 'Feedback type is required' });
    }
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ msg: 'Feedback message is required' });
    }

    // Verify student belongs to this supervisor (directly OR via company assignment)
    const assignedCompanies = await Company.find({ assignedSupervisor: req.user.id }).select('_id').lean();
    const companyIds = assignedCompanies.map((c) => c._id);

    const studentDoc = await Student.findOne({ user: studentId }).populate('user').lean();
    const isDirect = studentDoc && String(studentDoc.academicSupervisor || '') === String(req.user.id);
    let isViaCompany = false;
    let matchedApplication = null;
    if (!isDirect && companyIds.length > 0) {
      const app = await Application.findOne({
        studentUser: studentId,
        company: { $in: companyIds },
        status: { $in: ['shortlisted', 'allocated'] },
      })
        .select('_id studentName industrialSupervisor')
        .lean();
      matchedApplication = app || null;
      isViaCompany = Boolean(app);
    }

    if (!isDirect && !isViaCompany) {
      return res.status(403).json({ msg: 'Student not assigned to you' });
    }

    const studentName =
      (studentDoc && studentDoc.user && studentDoc.user.name) ||
      (matchedApplication && matchedApplication.studentName) ||
      'Student';

    const feedback = new Feedback({
      studentUser: studentId,
      studentName,
      supervisorUser: req.user.id,
      supervisorName: user.name,
      month: month ? String(month) : undefined,
      type,
      message,
      status: 'Sent',
      sentAt: new Date(),
    });

    await feedback.save();

    // Notify student via socket
    const io = req.app.get('io');
    if (io) {
      io.to(String(studentId)).emit('student:update', { type: 'feedback' });

      // Notify industrial supervisor(s) handling this student so feedback appears live.
      const industrialSupervisorIds = await Application.distinct('industrialSupervisor', {
        studentUser: studentId,
        status: { $in: ['shortlisted', 'allocated'] },
        industrialSupervisor: { $exists: true, $ne: null },
      });
      for (const supervisorId of industrialSupervisorIds) {
        io.to(String(supervisorId)).emit('industry:update', { type: 'feedback', studentId: String(studentId) });
      }
    }

    res.json(feedback);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

module.exports = router;
