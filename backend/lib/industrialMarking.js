const mongoose = require('mongoose');
const User = require('../models/User');
const Evaluation = require('../models/Evaluation');
const Student = require('../models/Student');
const Application = require('../models/Application');

const TOTAL_MONTHS = 4;
const TOTAL_WEIGHTAGE = 50;
const MONTH_WEIGHTAGE = TOTAL_WEIGHTAGE / TOTAL_MONTHS;

/** Industrial supervisors registered to this company only. */
async function getIndustrialEvaluatorIdsForCompany(companyId) {
  if (!companyId || !mongoose.Types.ObjectId.isValid(String(companyId))) {
    return [];
  }
  const cid = new mongoose.Types.ObjectId(String(companyId));
  const rows = await User.find({ role: 'industrial_supervisor', companyId: cid })
    .select('_id')
    .lean();
  return rows.map((r) => r._id);
}

async function resolvePlacementCompanyId(studentUserId, companyIdHint) {
  if (companyIdHint && mongoose.Types.ObjectId.isValid(String(companyIdHint))) {
    return String(companyIdHint);
  }
  return getStudentAllocatedCompanyId(studentUserId);
}

/**
 * Industrial (4‑month) progress for a student at their **current placement company** only.
 * Evaluations from a previous company (after shuffle/replacement) are not counted.
 */
async function getIndustrialMarkingStats(studentUserId, companyId) {
  const sid =
    mongoose.Types.ObjectId.isValid(studentUserId) ? new mongoose.Types.ObjectId(studentUserId) : null;
  if (!sid) {
    return { monthsCompleted: 0, externalOutOf50: 0, complete: false };
  }

  const scopeCompanyId = await resolvePlacementCompanyId(studentUserId, companyId);
  if (!scopeCompanyId) {
    return { monthsCompleted: 0, externalOutOf50: 0, complete: false };
  }

  const evaluatorIds = await getIndustrialEvaluatorIdsForCompany(scopeCompanyId);
  if (evaluatorIds.length === 0) {
    return { monthsCompleted: 0, externalOutOf50: 0, complete: false };
  }

  const [row] = await Evaluation.aggregate([
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
        _id: {
          studentUser: '$studentUser',
          monthKey: '$monthKey',
        },
        score: { $first: '$score' },
        maxScore: { $first: '$maxScore' },
      },
    },
    {
      $group: {
        _id: '$_id.studentUser',
        monthsCompleted: { $sum: 1 },
        obtainedWeightage: {
          $sum: {
            $multiply: [
              {
                $cond: [{ $gt: ['$maxScore', 0] }, { $divide: ['$score', '$maxScore'] }, 0],
              },
              MONTH_WEIGHTAGE,
            ],
          },
        },
      },
    },
  ]);

  const monthsCompleted = Math.max(0, Math.min(TOTAL_MONTHS, Number(row?.monthsCompleted || 0)));
  const externalOutOf50 = Math.max(0, Math.min(TOTAL_WEIGHTAGE, Number(row?.obtainedWeightage || 0)));
  const complete = monthsCompleted >= TOTAL_MONTHS;

  return {
    monthsCompleted,
    externalOutOf50: Number(externalOutOf50.toFixed(2)),
    complete,
  };
}

/**
 * Latest industrial monthly evaluation per calendar month key, for display (up to 4 months).
 * Scoped to the student's current placement company only.
 */
async function getIndustrialMonthlyBreakdown(studentUserId, companyId) {
  const sid =
    mongoose.Types.ObjectId.isValid(studentUserId) ? new mongoose.Types.ObjectId(studentUserId) : null;
  if (!sid) {
    return [];
  }

  const scopeCompanyId = await resolvePlacementCompanyId(studentUserId, companyId);
  if (!scopeCompanyId) {
    return [];
  }

  const evaluatorIds = await getIndustrialEvaluatorIdsForCompany(scopeCompanyId);
  if (evaluatorIds.length === 0) {
    return [];
  }

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
        score: { $first: '$score' },
        maxScore: { $first: '$maxScore' },
        evaluatorName: { $first: '$evaluatorName' },
        monthLabel: { $first: { $ifNull: ['$month', '$monthKey'] } },
      },
    },
    {
      $project: {
        _id: 0,
        monthKey: '$_id',
        month: '$monthLabel',
        score: 1,
        maxScore: 1,
        evaluatorName: { $ifNull: ['$evaluatorName', ''] },
      },
    },
  ]);

  rows.sort((a, b) => String(a.monthKey || '').localeCompare(String(b.monthKey || '')));
  return rows.slice(0, TOTAL_MONTHS).map((r) => {
    const score = Number(r.score || 0);
    const maxScore = Number(r.maxScore || 0);
    const weightedOutOf125 =
      maxScore > 0 ? Number(((score / maxScore) * MONTH_WEIGHTAGE).toFixed(2)) : 0;
    return {
      monthKey: String(r.monthKey || ''),
      month: String(r.month || r.monthKey || ''),
      score,
      maxScore,
      weightedOutOf125,
      evaluatorName: String(r.evaluatorName || ''),
    };
  });
}

/** Company for the student's active allocated internship (current placement). */
async function getStudentAllocatedCompanyId(studentUserId) {
  const sid =
    mongoose.Types.ObjectId.isValid(studentUserId) ? new mongoose.Types.ObjectId(studentUserId) : null;
  if (!sid) return null;

  const app = await Application.findOne({ studentUser: sid, status: 'allocated' })
    .select('company')
    .sort({ updatedAt: -1, appliedDate: -1 })
    .lean();
  if (app?.company) return String(app.company);

  const st = await Student.findOne({ user: sid }).select('allocatedCompany').lean();
  if (st?.allocatedCompany) return String(st.allocatedCompany);
  return null;
}

module.exports = {
  getIndustrialMarkingStats,
  getIndustrialMonthlyBreakdown,
  getStudentAllocatedCompanyId,
  getIndustrialEvaluatorIdsForCompany,
  TOTAL_MONTHS,
  TOTAL_WEIGHTAGE,
};
