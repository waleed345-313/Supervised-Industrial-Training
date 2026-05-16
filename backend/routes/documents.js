const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const mongoose = require('mongoose');
const Document = require('../models/document');
const User = require('../models/User');
const Company = require('../models/Company');
const Application = require('../models/Application');
const Internship = require('../models/internship');
const Student = require('../models/Student');
const auth = require('../middleware/auth');
const { isHiddenFromCompanyFocal } = require('../lib/focalApplications');
const { applyAllocationEffects } = require('../lib/allocation');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', 'uploads', 'company-docs');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '') || '.bin';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

function emitDocEvents(req, companyId, studentUserId) {
  const io = req.app.get('io');
  if (!io) return;
  io.to(`company:${companyId}`).emit('company:update', { type: 'documents' });
  if (studentUserId) io.to(String(studentUserId)).emit('student:update', { type: 'documents' });
}

async function emitSupervisorAndFocalDocEvents(req, companyId) {
  const io = req.app.get('io');
  if (!io || !companyId) return;
  const supervisors = await Company.find({ _id: companyId }).select('assignedSupervisor').lean();
  for (const c of supervisors) {
    if (c?.assignedSupervisor) {
      io.to(String(c.assignedSupervisor)).emit('supervisor:update', { type: 'documents' });
    }
  }
  io.emit('focal:update', { type: 'documents' });
}

/** User id reference on an Application (schema field is studentUser). */
function applicationStudentUserId(appDoc) {
  const u = appDoc.studentUser;
  if (!u) return null;
  if (typeof u === 'object' && u._id != null) return u._id;
  return u;
}

const COMPLETION_UPLOAD_TYPES = {
  completion_letter: { label: 'Completion letter', markStudentCompleted: true },
  completion_sit_1: { label: 'Completion letter (SIT 1)', markStudentCompleted: false },
  completion_sit_2: { label: 'Completion letter (SIT 2)', markStudentCompleted: true },
};

function normalizeDocument(doc) {
  const o = doc.toObject ? doc.toObject() : doc;
  const intern = o.internship;
  const comp = o.company;
  const companyName =
    comp && typeof comp === 'object' && 'name' in comp && comp.name ? String(comp.name) : undefined;
  return {
    id: String(o._id),
    name: o.name,
    type: o.type,
    uploadedBy: o.uploadedBy,
    uploadedDate: o.uploadedDate instanceof Date ? o.uploadedDate.toISOString().slice(0, 10) : String(o.uploadedDate || '').slice(0, 10),
    url: o.url,
    studentName: o.studentName,
    studentUserId: String(o.studentUser),
    applicationId: o.application ? String(o.application) : undefined,
    internshipTitle: intern && intern.title ? intern.title : undefined,
    companyName: companyName || undefined,
  };
}

/**
 * Slot label for student-uploaded files: first/second standard application, placement-office replacement, or company change ("shuffle").
 */
function computeStudentDocumentApplicationSlot(doc, priorityList, replacementList) {
  const o = doc.toObject ? doc.toObject() : doc;
  const app = o.application;
  const internId =
    o.internship && (typeof o.internship === 'object' && o.internship._id != null)
      ? String(o.internship._id)
      : o.internship
        ? String(o.internship)
        : null;

  const replacementSlot = (remarks) => {
    const r = String(remarks || '').toLowerCase();
    if (r.includes('company change')) return 'shuffle';
    return 'replacement';
  };

  if (app && typeof app === 'object' && app._id != null) {
    if (app.isReplacement) {
      return replacementSlot(app.remarks);
    }
    const idx = priorityList.findIndex((a) => String(a._id) === String(app._id));
    if (idx === 0) return 'priority1';
    if (idx === 1) return 'priority2';
    if (idx > 1) return 'priority2';
  }

  if (internId) {
    const pIdx = priorityList.findIndex((a) => String(a.internshipId) === internId);
    if (pIdx === 0) return 'priority1';
    if (pIdx === 1) return 'priority2';
    if (pIdx > 1) return 'priority2';

    const rep = replacementList.find((a) => String(a.internshipId) === internId);
    if (rep) return replacementSlot(rep.remarks);
  }

  return undefined;
}

async function assertCompanyFocal(req, res) {
  const user = await User.findById(req.user.id);
  if (!user || user.role !== 'company_focal') {
    res.status(403).json({ msg: 'Only company focal persons can manage these documents' });
    return null;
  }
  if (!user.companyId) {
    res.status(400).json({ msg: 'Your account is not linked to a company' });
    return null;
  }
  return user;
}

// @route   GET /api/documents/company/me
// @desc    Documents uploaded by this company
router.get('/company/me', auth, async (req, res) => {
  try {
    const user = await assertCompanyFocal(req, res);
    if (!user) return;

    const docs = await Document.find({ company: user.companyId })
      .populate('internship', 'title')
      .populate('company', 'name')
      .sort({ uploadedDate: -1 });
    // Attendance sheet is company-level: return only latest one.
    const latestAttendance = docs.find((d) => d.type === 'attendance_sheet');
    const filtered = docs.filter((d) => d.type !== 'attendance_sheet');
    if (latestAttendance) filtered.unshift(latestAttendance);
    res.json(filtered.map(normalizeDocument));
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/documents/student/me
// @desc    All documents for this student (company letters + student uploads); student uploads include applicationSlot when derivable
router.get('/student/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'student') {
      return res.status(403).json({ msg: 'Students only' });
    }

    const priorityList = await Application.find({
      studentUser: user._id,
      isReplacement: { $ne: true },
    })
      .sort({ appliedDate: 1 })
      .select('_id internshipId')
      .lean();

    const replacementList = await Application.find({
      studentUser: user._id,
      isReplacement: true,
    })
      .select('_id internshipId remarks')
      .lean();

    const docs = await Document.find({ studentUser: user._id })
      .populate('internship', 'title')
      .populate('company', 'name')
      .populate('application', 'isReplacement remarks internshipId')
      .sort({ uploadedDate: -1 });

    const out = docs.map((doc) => {
      const normalized = normalizeDocument(doc);
      const slot = computeStudentDocumentApplicationSlot(doc, priorityList, replacementList);
      if (slot) {
        normalized.applicationSlot = slot;
      }
      return normalized;
    });
    res.json(out);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/documents/supervisor/me
// @desc    Attendance sheets from companies assigned to this academic supervisor
router.get('/supervisor/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'academic_supervisor') {
      return res.status(403).json({ msg: 'Academic supervisors only' });
    }

    const assignedCompanies = await Company.find({ assignedSupervisor: req.user.id }).select('_id').lean();
    const companyIds = assignedCompanies.map((c) => c._id);
    if (companyIds.length === 0) return res.json([]);

    const docs = await Document.find({
      company: { $in: companyIds },
      type: 'attendance_sheet',
    })
      .populate('internship', 'title')
      .populate('company', 'name')
      .sort({ uploadedDate: -1 });
    res.json(docs.map(normalizeDocument));
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/documents/focal/me
// @desc    All company-uploaded documents for university focal
router.get('/focal/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'university_focal') {
      return res.status(403).json({ msg: 'University focal only' });
    }
    const docs = await Document.find({
      type: { $in: ['attendance_sheet', 'acceptance_letter', 'completion_letter', 'completion_sit_1', 'completion_sit_2'] },
    })
      .populate('internship', 'title')
      .populate('company', 'name')
      .populate('application', 'status isReplacement remarks createdAt updatedAt')
      .sort({ uploadedDate: -1 });

    // If a student has multiple acceptance letters (company change/transfer),
    // show ONLY the latest allocated acceptance letter (i.e. the new company),
    // and label it as "Acceptance Letter (change) — Student Name" when routed via placement change.
    const acceptanceByStudent = new Map();
    for (const d of docs) {
      if (d.type !== 'acceptance_letter') continue;
      const sid = String(d.studentUser || '');
      if (!sid) continue;
      if (!acceptanceByStudent.has(sid)) acceptanceByStudent.set(sid, []);
      acceptanceByStudent.get(sid).push(d);
    }

    const allowedAcceptanceIds = new Set();
    for (const [sid, list] of acceptanceByStudent.entries()) {
      const allocated = list.filter((x) => x.application && x.application.status === 'allocated');
      const source = allocated.length > 0 ? allocated : list;
      const chosen = source[0]; // docs are already sorted by uploadedDate desc
      if (chosen?._id) allowedAcceptanceIds.add(String(chosen._id));
    }

    const filtered = docs.filter((d) => d.type !== 'acceptance_letter' || allowedAcceptanceIds.has(String(d._id)));

    const out = filtered.map((doc) => {
      const normalized = normalizeDocument(doc);
      if (normalized.type !== 'acceptance_letter') return normalized;
      const app = doc.application;
      const isChange =
        Boolean(app?.isReplacement) &&
        typeof app?.remarks === 'string' &&
        /company\s+change/i.test(app.remarks);
      if (isChange) {
        normalized.name = `Acceptance Letter (change) — ${normalized.studentName || 'Student'}`;
      }
      return normalized;
    });

    res.json(out);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/documents/download/:id
// @desc    Download stored file (company focal for that company, or the related student)
router.get('/download/:id', auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ msg: 'Not found' });
    }
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(401).json({ msg: 'Unauthorized' });
    }

    const doc = await Document.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ msg: 'Document not found' });
    }

    const isFocal =
      user.role === 'company_focal' && user.companyId && String(doc.company) === String(user.companyId);
    const isStudent = user.role === 'student' && String(doc.studentUser) === String(user._id);

    if (!isFocal && !isStudent) {
      return res.status(403).json({ msg: 'Access denied' });
    }

    const rel = doc.url.replace(/^\//, '');
    const filePath = path.join(__dirname, '..', rel);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ msg: 'File missing' });
    }
    res.download(filePath, doc.originalFileName || doc.name);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/documents/company/upload
// @desc    Upload acceptance or completion letter for a student application
router.post('/company/upload', auth, upload.single('file'), async (req, res) => {
  try {
    const user = await assertCompanyFocal(req, res);
    if (!user) return;

    if (!req.file) {
      return res.status(400).json({ msg: 'File is required' });
    }

    const { applicationId, documentType } = req.body;

    const allowedLetterTypes = [
      'acceptance_letter',
      'attendance_sheet',
      ...Object.keys(COMPLETION_UPLOAD_TYPES),
    ];
    if (!allowedLetterTypes.includes(documentType)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        msg: 'documentType must be acceptance_letter or a completion type (completion_sit_1, completion_sit_2, completion_letter)',
      });
    }

    const publicUrl = `/uploads/company-docs/${req.file.filename}`;
    const completionCfg = COMPLETION_UPLOAD_TYPES[documentType];
    const displayName =
      documentType === 'acceptance_letter'
        ? 'Acceptance letter'
        : documentType === 'attendance_sheet'
          ? 'Attendance sheet'
          : completionCfg.label;

    if (documentType === 'attendance_sheet') {
      const allocatedApps = await Application.find({
        company: user.companyId,
        status: 'allocated',
      })
        .populate('internshipId', 'title')
        .select('studentUser studentName internshipId')
        .lean();

      if (allocatedApps.length === 0) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ msg: 'No allocated students found for your company.' });
      }

      const publicUrl = `/uploads/company-docs/${req.file.filename}`;
      // Keep attendance sheet as a single company-level document (covers all allocated students).
      await Document.deleteMany({ company: user.companyId, type: 'attendance_sheet' });

      const fallbackStudent = allocatedApps[0];
      const created = await Document.create({
        name: 'Attendance sheet — All allocated students',
        type: 'attendance_sheet',
        uploadedBy: user.name,
        uploadedByUser: user._id,
        url: publicUrl,
        company: user.companyId,
        // schema currently requires these; use a representative allocated student id/name
        studentUser: fallbackStudent.studentUser,
        studentName: 'All allocated students',
        originalFileName: req.file.originalname,
      });

      for (const app of allocatedApps) {
        emitDocEvents(req, String(user.companyId), String(app.studentUser));
      }
      await emitSupervisorAndFocalDocEvents(req, String(user.companyId));
      return res.json(normalizeDocument(await Document.findById(created._id).populate('internship', 'title')));
    }

    if (!applicationId || !mongoose.Types.ObjectId.isValid(applicationId)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ msg: 'Valid applicationId is required' });
    }

    const appDoc = await Application.findById(applicationId).populate({
      path: 'internshipId',
      select: 'company title seats seatsFilled status',
    });

    if (!appDoc || !appDoc.internshipId) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ msg: 'Application not found' });
    }

    const companyOnIntern = appDoc.internshipId.company;
    const cid = companyOnIntern && companyOnIntern.toString ? companyOnIntern.toString() : String(companyOnIntern);
    if (cid !== String(user.companyId)) {
      fs.unlinkSync(req.file.path);
      return res.status(403).json({ msg: 'Application is not for your company' });
    }

    if (documentType === 'acceptance_letter') {
      if (appDoc.status !== 'shortlisted') {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ 
          msg: `Cannot upload acceptance letter. Student application status is "${appDoc.status}". Please go to Applications page and accept the student first (status must be "shortlisted").` 
        });
      }

      const internCheck = await Internship.findById(appDoc.internshipId._id || appDoc.internshipId);
      if (internCheck && (internCheck.seatsFilled || 0) >= internCheck.seats) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ msg: 'All seats for this internship are already filled' });
      }

      const existing = await Document.findOne({ application: appDoc._id, type: 'acceptance_letter' });
      if (existing) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ msg: 'Acceptance letter already uploaded for this application' });
      }

      const allocResult = await applyAllocationEffects(appDoc._id);
      if (!allocResult.ok) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ msg: 'Could not allocate a seat (no seats remaining)' });
      }

      const saved = await Document.create({
        name: `${displayName} — ${appDoc.studentName}`,
        type: 'acceptance_letter',
        uploadedBy: user.name,
        uploadedByUser: user._id,
        url: publicUrl,
        company: user.companyId,
        studentUser: appDoc.studentUser,
        studentName: appDoc.studentName,
        application: appDoc._id,
        internship: appDoc.internshipId._id,
        originalFileName: req.file.originalname,
      });

      emitDocEvents(req, String(user.companyId), applicationStudentUserId(appDoc));
      await emitSupervisorAndFocalDocEvents(req, String(user.companyId));
      const io = req.app.get('io');
      if (io) {
        io.to(`company:${user.companyId}`).emit('company:update', { type: 'applications' });
        io.to(`company:${user.companyId}`).emit('company:update', { type: 'internships' });
        // Refresh supervisor-side student assignments after acceptance/company transfer.
        io.emit('supervisor:update', { type: 'students' });
        io.emit('supervisor:update', { type: 'applications' });
      }
      return res.json(normalizeDocument(await Document.findById(saved._id).populate('internship', 'title')));
    }

    // completion (legacy single letter + SIT 1 / SIT 2 parts)
    if (!completionCfg) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ msg: 'Invalid completion document type' });
    }

    if (appDoc.status !== 'allocated') {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ msg: 'Student must be allocated before uploading a completion letter' });
    }

    const studentUserId = applicationStudentUserId(appDoc);
    if (!studentUserId || !mongoose.Types.ObjectId.isValid(studentUserId)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ msg: 'Application is missing student reference' });
    }

    const existingC = await Document.findOne({
      application: appDoc._id,
      type: documentType,
    });
    if (existingC) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        msg: `A letter of this type was already uploaded for this application (${documentType}).`,
      });
    }

    // SIT-I completion letter → advance to SIT-II segment (same allocation, same company)
    if (documentType === 'completion_sit_1') {
      const uid =
        studentUserId instanceof mongoose.Types.ObjectId
          ? studentUserId
          : new mongoose.Types.ObjectId(String(studentUserId));
      const r = await Student.updateOne({ user: uid }, { $set: { sitPhase: 'sit_2' } });
      if (r.matchedCount === 0) {
        console.warn('[documents] completion_sit_1: no Student document matched user', String(uid));
      }
    }

    if (completionCfg.markStudentCompleted) {
      const stud = await Student.findOne({ user: studentUserId });
      if (stud) {
        stud.currentStatus = 'completed';
        await stud.save();
      }
    }

    const saved = await Document.create({
      name: `${displayName} — ${appDoc.studentName}`,
      type: documentType,
      uploadedBy: user.name,
      uploadedByUser: user._id,
      url: publicUrl,
      company: user.companyId,
      studentUser: studentUserId,
      studentName: appDoc.studentName,
      application: appDoc._id,
      internship: appDoc.internshipId._id,
      originalFileName: req.file.originalname,
    });

    emitDocEvents(req, String(user.companyId), studentUserId);
    await emitSupervisorAndFocalDocEvents(req, String(user.companyId));
    const io = req.app.get('io');
    if (io) {
      io.to(`company:${user.companyId}`).emit('company:update', { type: 'applications' });
    }
    return res.json(normalizeDocument(await Document.findById(saved._id).populate('internship', 'title')));
  } catch (err) {
    console.error(err.message);
    if (req.file?.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (_) {}
    }
    res.status(500).send('Server error');
  }
});

// @route   GET /api/documents
// @desc    Get all documents (legacy / admin)
router.get('/', async (req, res) => {
  try {
    const documents = await Document.find().populate('internship', 'title');
    res.json(documents.map(normalizeDocument));
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/documents/:id
// @desc    Get document by ID
router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ msg: 'Document not found' });
    }
    const document = await Document.findById(req.params.id).populate('internship', 'title');
    if (!document) {
      return res.status(404).json({ msg: 'Document not found' });
    }
    res.json(normalizeDocument(document));
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/documents
// @desc    Create a document (JSON body — legacy)
router.post('/', async (req, res) => {
  try {
    const document = new Document(req.body);
    await document.save();
    res.json(normalizeDocument(document));
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT /api/documents/:id
// @desc    Update document
router.put('/:id', async (req, res) => {
  try {
    const document = await Document.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('internship', 'title');
    if (!document) {
      return res.status(404).json({ msg: 'Document not found' });
    }
    res.json(normalizeDocument(document));
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE /api/documents/:id
// @desc    Delete document
router.delete('/:id', auth, async (req, res) => {
  try {
    const user = await assertCompanyFocal(req, res);
    if (!user) return;

    const document = await Document.findById(req.params.id);
    if (!document || String(document.company) !== String(user.companyId)) {
      return res.status(404).json({ msg: 'Document not found' });
    }

    const rel = document.url.replace(/^\//, '');
    const filePath = path.join(__dirname, '..', rel);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (_) {}
    }

    await Document.findByIdAndDelete(req.params.id);
    emitDocEvents(req, String(user.companyId), String(document.studentUser));
    await emitSupervisorAndFocalDocEvents(req, String(user.companyId));
    res.json({ msg: 'Document deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/documents/student/resume
// @desc    Student uploads resume/CV when applying
router.post('/student/resume', auth, upload.single('file'), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'student') {
      return res.status(403).json({ msg: 'Only students can upload resume' });
    }

    const { applicationId } = req.body;
    if (!applicationId) {
      return res.status(400).json({ msg: 'Application ID is required' });
    }

    const application = await Application.findById(applicationId);
    if (!application) {
      return res.status(404).json({ msg: 'Application not found' });
    }

    // Verify the application belongs to this student
    if (application.studentUser.toString() !== user._id.toString()) {
      return res.status(403).json({ msg: 'Not authorized to upload for this application' });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ msg: 'No file uploaded' });
    }

    const doc = new Document({
      name: file.originalname || 'Resume',
      type: 'resume',
      uploadedBy: user.name,
      uploadedByUser: user._id,
      url: `/uploads/company-docs/${file.filename}`,
      company: application.company,
      studentUser: user._id,
      studentName: user.name,
      application: application._id,
      internship: application.internshipId,
      originalFileName: file.originalname,
    });

    await doc.save();
    res.json({ msg: 'Resume uploaded', document: doc });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/documents/application/:applicationId
// @desc    Get documents for a specific application
router.get('/application/:applicationId', auth, async (req, res) => {
  try {
    const { applicationId } = req.params;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    // Fetch the application to check permissions
    const application = await Application.findById(applicationId);
    if (!application) {
      return res.status(404).json({ msg: 'Application not found' });
    }

    // Allow if user is the student who applied, or company focal/supervisor for the company
    const isStudent = user.role === 'student' && application.studentUser.toString() === user._id.toString();
    const userCompanyId = user.companyId ? user.companyId.toString() : null;
    const appCompanyId = application.company ? application.company.toString() : null;
    const isCompany = ['company_focal', 'industrial_supervisor'].includes(user.role) && 
                      userCompanyId && userCompanyId === appCompanyId;

    console.log('Documents auth check:', { 
      userRole: user.role, 
      userCompanyId, 
      appCompanyId, 
      isStudent, 
      isCompany 
    });

    if (!isStudent && !isCompany) {
      return res.status(403).json({ msg: 'Not authorized to view these documents' });
    }

    if (isCompany && isHiddenFromCompanyFocal(application)) {
      return res.status(404).json({ msg: 'Application not found' });
    }

    const documents = await Document.find({ application: applicationId });
    res.json(documents);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
