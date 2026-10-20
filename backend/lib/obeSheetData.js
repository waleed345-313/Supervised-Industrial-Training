const mongoose = require('mongoose');
const User = require('../models/User');
const Student = require('../models/Student');
const Application = require('../models/Application');
const Evaluation = require('../models/Evaluation');
const FinalGrade = require('../models/FinalGrade');

const {
  getIndustrialMarkingStats,
  getStudentAllocatedCompanyId,
  getIndustrialEvaluatorIdsForStudent,
  TOTAL_MONTHS,
} = require('./industrialMarking');
const { serializeFinalGrade } = require('./serializeFinalGrade');
const { aggregateFromContributions } = require('./finalGradeAggregate');

/** Industrial supervisor monthly rubrics (same order as evaluations + dashboard). */
const OBE_MONTHLY_PLO_KEYS = [
  'problemAnalysis',
  'investigation',
  'modernToolUsage',
  'ethics',
  'individualTeamwork',
  'communication',
  'projectManagement',
  'lifeLongLearning',
];

const OBE_MONTHLY_RAW_MAX = OBE_MONTHLY_PLO_KEYS.length * 10;
const MONTH_WEIGHTAGE = 50 / TOTAL_MONTHS;

const CANONICAL_MONTH_LABELS = ['Month 1', 'Month 2', 'Month 3', 'Month 4'];

const PLO_PERCENT_COLUMNS = [
  { key: 'problemAnalysis', label: 'PLO2' },
  { key: 'investigation', label: 'PLO4' },
  { key: 'modernToolUsage', label: 'PLO5' },
  { key: 'ethics', label: 'PLO8' },
  { key: 'individualTeamwork', label: 'PLO9' },
  { key: 'communication', label: 'PLO10' },
  { key: 'projectManagement', label: 'PLO11' },
  { key: 'lifeLongLearning', label: 'PLO12' },
];

function clampPloScore(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(10, n));
}

function normalizeScores(scores) {
  const out = {};
  for (const key of OBE_MONTHLY_PLO_KEYS) {
    out[key] = clampPloScore(scores?.[key]);
  }
  return out;
}

function monthRawTotal(scores) {
  return OBE_MONTHLY_PLO_KEYS.reduce((sum, key) => sum + clampPloScore(scores[key]), 0);
}

function computeExternalTotalFromMonths(months) {
  let total = 0;
  for (const m of months) {
    const raw = monthRawTotal(m.scores);
    if (OBE_MONTHLY_RAW_MAX > 0) {
      total += (raw / OBE_MONTHLY_RAW_MAX) * MONTH_WEIGHTAGE;
    }
  }
  return Number(Math.min(50, Math.max(0, total)).toFixed(8));
}

function computePloPercentages(months) {
  const out = {};
  for (const { key } of PLO_PERCENT_COLUMNS) {
    if (!months.length) {
      out[key] = 0;
      continue;
    }
    const pctSum = months.reduce((s, m) => s + (clampPloScore(m.scores[key]) / 10) * 100, 0);
    out[key] = Number((pctSum / months.length).toFixed(2));
  }
  return out;
}

async function collectInternshipAllocatedUserIds() {
  const appIds = await Application.distinct('studentUser', {
    status: { $in: ['allocated', 'shortlisted'] },
  });
  const fromDoc = await Student.find({
    currentStatus: { $in: ['allocated', 'shortlisted', 'completed'] },
  })
    .select('user')
    .lean();
  const uniq = new Set([...appIds.map((id) => String(id)), ...fromDoc.map((r) => String(r.user))]);
  return [...uniq]
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));
}

function resolveCanonicalIndustrialMonths(rows) {
  if (!rows?.length) return [];

  const byKey = new Map();
  for (const row of rows) {
    const key = String(row.monthKey || '').trim();
    if (!byKey.has(key)) byKey.set(key, row);
  }

  const ordered = [];
  for (const label of CANONICAL_MONTH_LABELS) {
    if (byKey.has(label)) {
      ordered.push(byKey.get(label));
      byKey.delete(label);
    }
  }

  const rest = [...byKey.values()].sort((a, b) =>
    String(a.monthKey || '').localeCompare(String(b.monthKey || ''))
  );
  return [...ordered, ...rest].slice(0, TOTAL_MONTHS);
}

function padIndustrialMonths(months) {
  const out = [...months];
  while (out.length < TOTAL_MONTHS) {
    out.push({
      monthKey: CANONICAL_MONTH_LABELS[out.length] || `Month ${out.length + 1}`,
      scores: normalizeScores({}),
    });
  }
  return out;
}

async function getIndustrialMonthlyObeMonths(studentUserId, companyId) {
  const sid =
    mongoose.Types.ObjectId.isValid(studentUserId) ? new mongoose.Types.ObjectId(studentUserId) : null;
  if (!sid) return [];

  const scopeCompanyId = companyId || (await getStudentAllocatedCompanyId(studentUserId));
  const evaluatorIds = await getIndustrialEvaluatorIdsForStudent(studentUserId, scopeCompanyId);
  if (!evaluatorIds.length) return [];

  const rows = await Evaluation.aggregate([
    {
      $match: {
        studentUser: sid,
        type: 'monthly',
        evaluatorUser: { $in: evaluatorIds },
      },
    },
    { $sort: { date: -1, updatedAt: -1, createdAt: -1 } },
    {
      $addFields: {
        monthKey: {
          $ifNull: [
            '$month',
            {
              $dateToString: {
                format: '%Y-%m',
                date: { $ifNull: ['$date', '$createdAt'] },
              },
            },
          ],
        },
      },
    },
    {
      $group: {
        _id: '$monthKey',
        scores: { $first: '$scores' },
      },
    },
    { $project: { _id: 0, monthKey: '$_id', scores: 1 } },
  ]);

  return resolveCanonicalIndustrialMonths(
    rows.map((r) => ({
      monthKey: String(r.monthKey || ''),
      scores: normalizeScores(r.scores || {}),
    }))
  );
}

function buildStudentObeRow(serial, index, months, agg, externalTotal, ploPct) {
  const presentationAvgVal = agg.contributorCount
    ? Number(agg.presentationAvg.toFixed(2))
    : 0;

  const monthCells = [];
  for (let i = 0; i < TOTAL_MONTHS; i += 1) {
    const m = months[i];
    for (const key of OBE_MONTHLY_PLO_KEYS) {
      monthCells.push(m ? clampPloScore(m.scores[key]) : '');
    }
  }

  return {
    serial: index + 1,
    registrationNo: serial.registrationNo,
    name: serial.name,
    months: months.map((m) => ({ scores: m.scores })),
    monthCells,
    externalTotal: Number(externalTotal.toFixed(8)),
    content: Number(agg.content.toFixed(2)),
    visuals: Number(agg.visuals.toFixed(2)),
    presentationSkills: Number(agg.presentationSkills.toFixed(2)),
    organization: Number(agg.organization.toFixed(2)),
    handlingOfQuestions: Number(agg.handlingOfQuestions.toFixed(2)),
    modernToolUsage: Number(agg.modernToolUsage.toFixed(2)),
    ethics: Number(agg.ethics.toFixed(2)),
    reportScore: Number(agg.reportScore.toFixed(2)),
    presentationAvg: presentationAvgVal,
    internalTotal: Number(agg.internalTotal.toFixed(2)),
    grandTotal: Number(serial.grandTotal.toFixed(2)),
    grade: serial.grade,
    ploPercentages: ploPct,
  };
}

/**
 * Students eligible for OBE export: same cohort as focal Final Grading "Completed"
 * (at least one internal final grade). Industrial months are included when on file.
 */
async function collectObeSheetExportRows() {
  const studentOids = await collectInternshipAllocatedUserIds();
  if (!studentOids.length) return [];

  const [students, users] = await Promise.all([
    Student.find({ user: { $in: studentOids } }).select('user studentId').lean(),
    User.find({ _id: { $in: studentOids }, role: 'student' }).select('name _id studentId').lean(),
  ]);

  const studentByUserId = new Map(students.map((s) => [String(s.user), s]));
  const userByUserId = new Map(users.map((u) => [String(u._id), u]));

  const gradeDocs = await FinalGrade.find({ studentUser: { $in: studentOids } }).sort({ submittedAt: -1 });
  const gradeByUserId = new Map();
  for (const g of gradeDocs) {
    const uid = String(g.studentUser || '');
    if (uid && !gradeByUserId.has(uid)) gradeByUserId.set(uid, g);
  }

  const eligible = [];

  for (const uid of studentOids) {
    const studentUserId = String(uid);
    const cid = await getStudentAllocatedCompanyId(studentUserId);
    const stats = await getIndustrialMarkingStats(studentUserId, cid);

    const gradeDoc = gradeByUserId.get(studentUserId);
    if (!gradeDoc) continue;

    const serialized = serializeFinalGrade(gradeDoc, stats);
    if (!serialized.internalEvaluations?.length) continue;

    const months = padIndustrialMonths(await getIndustrialMonthlyObeMonths(studentUserId, cid));

    const agg = aggregateFromContributions(serialized.internalEvaluations);
    const externalTotal = Number(stats.externalOutOf50 || 0);
    const ploPct = computePloPercentages(months);

    const studentRow = studentByUserId.get(studentUserId);
    const registrationNo =
      studentRow?.studentId || userByUserId.get(studentUserId)?.studentId || '';
    const name =
      userByUserId.get(studentUserId)?.name || serialized.studentName || '';

    eligible.push({
      studentUserId,
      registrationNo: String(registrationNo || '').trim(),
      name: String(name || '').trim(),
      grandTotal: serialized.grandTotal,
      grade: serialized.grade,
      months,
      agg,
      externalTotal,
      ploPct,
    });
  }

  eligible.sort((a, b) => String(a.name).localeCompare(String(b.name)));

  return eligible.map((row, index) =>
    buildStudentObeRow(
      {
        registrationNo: row.registrationNo,
        name: row.name,
        grandTotal: row.grandTotal,
        grade: row.grade,
      },
      index,
      row.months,
      row.agg,
      row.externalTotal,
      row.ploPct
    )
  );
}

module.exports = {
  OBE_MONTHLY_PLO_KEYS,
  OBE_MONTHLY_RAW_MAX,
  PLO_PERCENT_COLUMNS,
  TOTAL_MONTHS,
  collectObeSheetExportRows,
};
