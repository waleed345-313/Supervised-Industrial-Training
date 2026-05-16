const express = require('express');
const mongoose = require('mongoose');

const User = require('../models/User');
const Student = require('../models/Student');
const Application = require('../models/Application');
const Evaluation = require('../models/Evaluation');
const FinalGrade = require('../models/FinalGrade');

const auth = require('../middleware/auth');
const { getIndustrialMarkingStats, getStudentAllocatedCompanyId } = require('../lib/industrialMarking');
const { serializeFinalGrade } = require('../lib/serializeFinalGrade');
const { letterGrade } = require('../lib/finalGradeAggregate');

const router = express.Router();

async function collectInternshipAllocatedUserIds() {
  const appIds = await Application.distinct('studentUser', { status: 'allocated' });
  const fromDoc = await Student.find({ currentStatus: 'allocated' }).select('user').lean();
  const uniq = new Set([...appIds.map((id) => String(id)), ...fromDoc.map((r) => String(r.user))]);
  return [...uniq]
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));
}

function getUniqueEvaluatorCounts(internalEvaluations) {
  const academic = new Set();
  const panel = new Set();

  for (const row of internalEvaluations || []) {
    if (!row) continue;
    if (row.evaluatorRole === 'academic_supervisor' && row.evaluatorUser) {
      academic.add(String(row.evaluatorUser));
    }
    if (row.evaluatorRole === 'evaluation_panel' && row.evaluatorUser) {
      panel.add(String(row.evaluatorUser));
    }
  }

  return { academicCount: academic.size, panelCount: panel.size };
}

router.get('/final-grading', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('role');
    if (!user || !['university_focal', 'admin', 'manager_placements'].includes(user.role)) {
      return res.status(403).json({ msg: 'Not allowed' });
    }

    const studentOids = await collectInternshipAllocatedUserIds();
    if (!studentOids.length) return res.json({ pending: [], completed: [] });

    // studentId and names for listing
    const [students, users] = await Promise.all([
      Student.find({ user: { $in: studentOids } })
        .select('user studentId')
        .lean(),
      User.find({ _id: { $in: studentOids }, role: 'student' }).select('name email _id studentId').lean(),
    ]);

    const studentByUserId = new Map(students.map((s) => [String(s.user), s]));
    const userByUserId = new Map(users.map((u) => [String(u._id), u]));

    const gradeDocs = await FinalGrade.find({
      studentUser: { $in: studentOids },
    }).sort({ submittedAt: -1 });

    const gradeByUserId = new Map();
    for (const g of gradeDocs) {
      const uid = String(g.studentUser || '');
      if (uid && !gradeByUserId.has(uid)) gradeByUserId.set(uid, g);
    }

    const pending = [];
    const completed = [];

    for (const uid of studentOids) {
      const studentUserId = String(uid);
      const studentRow = studentByUserId.get(studentUserId);
      const studentId = studentRow?.studentId || userByUserId.get(studentUserId)?.studentId || '';
      const studentName = userByUserId.get(studentUserId)?.name || gradeByUserId.get(studentUserId)?.studentName || '';

      const cid = await getStudentAllocatedCompanyId(studentUserId);
      const stats = await getIndustrialMarkingStats(studentUserId, cid);

      const gradeDoc = gradeByUserId.get(studentUserId);
      const serialized = gradeDoc ? serializeFinalGrade(gradeDoc, stats) : null;

      const externalTotal = Number(stats.externalOutOf50 || 0);
      const internalTotal = serialized ? Number(serialized.internalTotal || 0) : 0;
      const grandTotal = Number((externalTotal + internalTotal).toFixed(2));
      const grade = letterGrade(grandTotal);

      const internalEvaluations = serialized?.internalEvaluations || [];
      const { academicCount, panelCount } = getUniqueEvaluatorCounts(internalEvaluations);

      // Treat as "Completed" as soon as ANY internal evaluator submits marks.
      // As additional evaluators submit, totals + counts update automatically.
      const isCompleted = academicCount + panelCount > 0;

      const row = {
        studentUserId,
        studentId,
        studentName,
        externalTotal,
        internalTotal,
        grandTotal,
        grade,
        academicCount,
        panelCount,
        internalEvaluations,
        isCompleted,
      };

      if (isCompleted) completed.push(row);
      else pending.push(row);
    }

    const sortByName = (a, b) => String(a.studentName || '').localeCompare(String(b.studentName || ''));
    pending.sort(sortByName);
    completed.sort(sortByName);

    res.json({ pending, completed });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;

