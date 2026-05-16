const express = require('express');
const mongoose = require('mongoose');
const Evaluation = require('../models/Evaluation');
const Application = require('../models/Application');
const Feedback = require('../models/Feedback');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

const MONTHLY_SCORE_KEYS = [
  'problemAnalysis',
  'investigation',
  'modernToolUsage',
  'ethics',
  'individualTeamwork',
  'communication',
  'projectManagement',
  'lifeLongLearning',
];

const MONTHLY_RAW_MAX_SCORE = MONTHLY_SCORE_KEYS.length * 10;

function normalizeEvaluation(doc) {
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    id: String(o._id),
    studentId: o.studentUser ? String(o.studentUser) : '',
    studentName: o.studentName || '',
    evaluatorId: o.evaluatorUser ? String(o.evaluatorUser) : '',
    evaluatorName: o.evaluatorName || '',
    type: o.type,
    month: o.month || '',
    score: Number(o.score || 0),
    maxScore: Number(o.maxScore || 0),
    remarks: o.remarks || '',
    date: o.date instanceof Date ? o.date.toISOString().slice(0, 10) : String(o.date || '').slice(0, 10),
  };
}

function computeMonthlyScore(scores) {
  return MONTHLY_SCORE_KEYS.reduce((sum, key) => {
    const raw = Number(scores?.[key]);
    if (!Number.isFinite(raw)) return sum;
    const bounded = Math.max(0, Math.min(10, raw));
    return sum + bounded;
  }, 0);
}

// @route   GET /api/evaluations/industrial/me
// @desc    Get monthly evaluations submitted by logged-in industrial supervisor
router.get('/industrial/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('role');
    if (!user || user.role !== 'industrial_supervisor') {
      return res.status(403).json({ msg: 'Only industrial supervisors can access this endpoint' });
    }

    const evaluations = await Evaluation.find({
      evaluatorUser: req.user.id,
      type: 'monthly',
    }).sort({ date: -1, createdAt: -1 });

    res.json(evaluations.map(normalizeEvaluation));
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/evaluations/industrial/me/feedback
// @desc    Get academic supervisor feedback for students assigned to logged-in industrial supervisor
router.get('/industrial/me/feedback', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('role companyId');
    if (!user || user.role !== 'industrial_supervisor') {
      return res.status(403).json({ msg: 'Only industrial supervisors can access this endpoint' });
    }

    const { month } = req.query || {};
    const monthFilter = String(month || '').trim();

    const assignedStudentIds = await Application.distinct('studentUser', {
      company: user.companyId,
      industrialSupervisor: req.user.id,
      status: { $in: ['shortlisted', 'allocated'] },
    });

    if (!assignedStudentIds.length) {
      return res.json([]);
    }

    const academicSupervisors = await User.find({ role: 'academic_supervisor' }).select('_id').lean();
    const academicSupervisorIds = academicSupervisors.map((sup) => sup._id);

    if (!academicSupervisorIds.length) {
      return res.json([]);
    }

    const feedback = await Feedback.find({
      studentUser: { $in: assignedStudentIds },
      supervisorUser: { $in: academicSupervisorIds },
      ...(monthFilter ? { month: monthFilter } : {}),
    })
      .select('studentUser studentName supervisorUser supervisorName month type message status sentAt createdAt')
      .sort({ sentAt: -1, createdAt: -1 })
      .lean();

    const normalized = feedback.map((item) => ({
      id: String(item._id),
      studentId: String(item.studentUser || ''),
      studentName: item.studentName || '',
      supervisorId: String(item.supervisorUser || ''),
      supervisorName: item.supervisorName || '',
      month: String(item.month || ''),
      type: item.type || '',
      message: item.message || '',
      status: item.status || 'Sent',
      sentAt: item.sentAt instanceof Date
        ? item.sentAt.toISOString().slice(0, 10)
        : String(item.sentAt || item.createdAt || '').slice(0, 10),
    }));

    res.json(normalized);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/evaluations/industrial/me
// @desc    Create monthly evaluation for an assigned student by logged-in industrial supervisor
router.post('/industrial/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('name role companyId');
    if (!user || user.role !== 'industrial_supervisor') {
      return res.status(403).json({ msg: 'Only industrial supervisors can submit monthly evaluations' });
    }

    const { studentId, month, scores, remarks } = req.body || {};
    if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ msg: 'Valid studentId is required' });
    }

    const monthLabel = String(month || '').trim();
    if (!monthLabel) {
      return res.status(400).json({ msg: 'Month is required' });
    }

    const scorePayload = scores && typeof scores === 'object' ? scores : {};
    const totalScore = computeMonthlyScore(scorePayload);

    const assignment = await Application.findOne({
      studentUser: studentId,
      industrialSupervisor: req.user.id,
      company: user.companyId,
      status: { $in: ['shortlisted', 'allocated'] },
    }).select('studentName');

    if (!assignment) {
      return res.status(403).json({ msg: 'Student is not assigned to this industrial supervisor' });
    }

    const existing = await Evaluation.findOne({
      studentUser: studentId,
      evaluatorUser: req.user.id,
      type: 'monthly',
      month: monthLabel,
    }).select('_id');

    if (existing) {
      return res.status(409).json({ msg: 'already evaluation done for this month' });
    }

    const evaluation = new Evaluation({
      studentUser: studentId,
      studentName: assignment.studentName || 'Student',
      evaluatorUser: req.user.id,
      evaluatorName: user.name || 'Industrial Supervisor',
      type: 'monthly',
      month: monthLabel,
      scores: scorePayload,
      score: totalScore,
      maxScore: MONTHLY_RAW_MAX_SCORE,
      remarks: String(remarks || ''),
      date: new Date(),
    });

    await evaluation.save();

    const io = req.app.get('io');
    if (io) {
      io.to(String(req.user.id)).emit('industry:update', { type: 'evaluations' });
      io.to(String(studentId)).emit('student:update', { type: 'evaluations' });
    }

    res.json(normalizeEvaluation(evaluation));
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/evaluations
// @desc    Get all evaluations
router.get('/', async (req, res) => {
  try {
    const evaluations = await Evaluation.find();
    res.json(evaluations);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/evaluations/:id
// @desc    Get evaluation by ID
router.get('/:id', async (req, res) => {
  try {
    const evaluation = await Evaluation.findById(req.params.id);
    if (!evaluation) {
      return res.status(404).json({ msg: 'Evaluation not found' });
    }
    res.json(evaluation);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/evaluations
// @desc    Create an evaluation
router.post('/', async (req, res) => {
  try {
    const evaluation = new Evaluation(req.body);
    await evaluation.save();
    res.json(evaluation);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT /api/evaluations/:id
// @desc    Update evaluation
router.put('/:id', async (req, res) => {
  try {
    const evaluation = await Evaluation.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!evaluation) {
      return res.status(404).json({ msg: 'Evaluation not found' });
    }
    res.json(evaluation);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE /api/evaluations/:id
// @desc    Delete evaluation
router.delete('/:id', async (req, res) => {
  try {
    const evaluation = await Evaluation.findByIdAndDelete(req.params.id);
    if (!evaluation) {
      return res.status(404).json({ msg: 'Evaluation not found' });
    }
    res.json({ msg: 'Evaluation deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;