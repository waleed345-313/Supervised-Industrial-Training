const express = require('express');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const CompanyFocalFeedback = require('../models/CompanyFocalFeedback');
const User = require('../models/User');
const Company = require('../models/Company');
const Application = require('../models/Application');

const router = express.Router();

function normalizeFeedback(raw) {
  const o =
    raw && typeof raw.toObject === 'function' ? raw.toObject() : { ...raw };
  const submittedRaw = o.updatedAt ?? o.updated_at;
  const submitted = submittedRaw ? new Date(submittedRaw) : null;
  return {
    id: String(o._id),
    studentId: String(o.studentUser),
    studentName: o.studentName,
    companyId: String(o.company),
    companyName: o.companyName,
    focalName: o.focalName,
    performanceRating: o.performanceRating,
    attendanceRating: o.attendanceRating,
    professionalismRating: o.professionalismRating,
    technicalSkillsRating: o.technicalSkillsRating,
    communicationRating: o.communicationRating,
    overallScore: o.overallScore,
    remarks: o.remarks || '',
    recommendation: o.recommendation,
    status: o.status || 'submitted',
    submittedDate: submitted && !Number.isNaN(+submitted) ? submitted.toISOString().split('T')[0] : null,
    submittedAt: submitted && !Number.isNaN(+submitted) ? submitted.toISOString() : undefined,
  };
}

// @route   POST /api/company-feedback/me
// @desc    Upsert feedback for one student from this company's focal user
router.post('/me', auth, async (req, res) => {
  try {
    const actor = await User.findById(req.user.id);
    if (!actor || actor.role !== 'company_focal' || !actor.companyId) {
      return res.status(403).json({ msg: 'Not allowed' });
    }

    const {
      studentId,
      performanceRating,
      attendanceRating,
      professionalismRating,
      technicalSkillsRating,
      communicationRating,
      remarks,
      recommendation,
    } = req.body || {};

    if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ msg: 'Invalid student ID' });
    }

    const recs = ['highly_recommend', 'recommend', 'neutral', 'not_recommend'];
    if (!recommendation || !recs.includes(recommendation)) {
      return res.status(400).json({ msg: 'Valid recommendation is required' });
    }

    const nums = [
      performanceRating,
      attendanceRating,
      professionalismRating,
      technicalSkillsRating,
      communicationRating,
    ];
    for (const n of nums) {
      const v = Number(n);
      if (!Number.isFinite(v) || v < 1 || v > 10) {
        return res.status(400).json({ msg: 'Each rating must be between 1 and 10' });
      }
    }

    const allocated = await Application.findOne({
      studentUser: studentId,
      company: actor.companyId,
      status: 'allocated',
    }).lean();

    if (!allocated) {
      return res.status(403).json({ msg: 'Student is not allocated to your company' });
    }

    const [company, studentUser] = await Promise.all([
      Company.findById(actor.companyId).select('name').lean(),
      User.findById(studentId).select('name').lean(),
    ]);

    const overallScore =
      (Number(performanceRating) +
        Number(attendanceRating) +
        Number(professionalismRating) +
        Number(technicalSkillsRating) +
        Number(communicationRating)) /
      5;

    const filter = { studentUser: studentId, company: actor.companyId };
    const update = {
      focalUser: actor._id,
      studentName: studentUser?.name || allocated.studentName || 'Student',
      companyName: company?.name || allocated.companyName || 'Company',
      focalName: actor.name || 'Company focal',
      performanceRating: Number(performanceRating),
      attendanceRating: Number(attendanceRating),
      professionalismRating: Number(professionalismRating),
      technicalSkillsRating: Number(technicalSkillsRating),
      communicationRating: Number(communicationRating),
      overallScore,
      remarks: typeof remarks === 'string' ? remarks.slice(0, 500) : '',
      recommendation,
      status: 'submitted',
    };

    const doc = await CompanyFocalFeedback.findOneAndUpdate(filter, update, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    });

    const io = req.app.get('io');
    if (io) {
      const viewers = await User.find({
        role: { $in: ['university_focal', 'admin', 'manager_placements'] },
      }).select('_id');

      viewers.forEach((u) => {
        io.to(String(u._id)).emit('company-feedback:update', {
          studentId: String(studentId),
        });
      });
    }

    res.json(normalizeFeedback(doc));
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/company-feedback/me
// @desc    List feedback submitted by this company
router.get('/me', auth, async (req, res) => {
  try {
    const actor = await User.findById(req.user.id);
    if (!actor || actor.role !== 'company_focal' || !actor.companyId) {
      return res.status(403).json({ msg: 'Not allowed' });
    }

    const docs = await CompanyFocalFeedback.find({ company: actor.companyId })
      .sort({ updatedAt: -1 })
      .lean();

    res.json(docs.map((d) => normalizeFeedback(d)));
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/company-feedback/student/:studentId
// @desc    Company focal feedback rows for one student (university focal / placements / admin)
router.get('/student/:studentId', auth, async (req, res) => {
  try {
    const actor = await User.findById(req.user.id);
    if (
      !actor ||
      !['university_focal', 'admin', 'manager_placements'].includes(actor.role)
    ) {
      return res.status(403).json({ msg: 'Not allowed' });
    }

    const { studentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ msg: 'Invalid student ID' });
    }

    const docs = await CompanyFocalFeedback.find({ studentUser: studentId })
      .sort({ updatedAt: -1 })
      .lean();

    res.json(docs.map((d) => normalizeFeedback(d)));
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
