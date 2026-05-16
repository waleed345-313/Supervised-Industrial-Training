const mongoose = require('mongoose');
const FinalGrade = require('../models/FinalGrade');
const { getContributionList } = require('./serializeFinalGrade');
const {
  aggregateFromContributions,
  contributorInternalTotal,
  presentationAvg,
  letterGrade,
} = require('./finalGradeAggregate');

function toSubdoc(contribution) {
  return {
    evaluatorUser:
      mongoose.Types.ObjectId.isValid(contribution.evaluatorUser)
        ? new mongoose.Types.ObjectId(contribution.evaluatorUser)
        : contribution.evaluatorUser,
    evaluatorName: contribution.evaluatorName,
    evaluatorRole: contribution.evaluatorRole,
    content: contribution.content,
    visuals: contribution.visuals,
    presentationSkills: contribution.presentationSkills,
    organization: contribution.organization,
    handlingOfQuestions: contribution.handlingOfQuestions,
    modernToolUsage: contribution.modernToolUsage ?? 0,
    ethics: contribution.ethics ?? 0,
    reportScore: contribution.reportScore,
    presentationAvg: contribution.presentationAvg,
    internalTotal: contribution.internalTotal,
    remarks: contribution.remarks || '',
    submittedAt: contribution.submittedAt || new Date(),
  };
}

/**
 * Add or replace one internal evaluator row; recompute averages (still out of 50 total internally).
 */
async function upsertInternalFinalContribution({
  studentId,
  studentName,
  supervisorOwnerUserId,
  supervisorOwnerName,
  evaluatorUserId,
  evaluatorName,
  evaluatorRole,
  marks,
  remarks,
  industrialStats,
}) {
  const presAvg = presentationAvg(marks);
  const contribInternal = contributorInternalTotal(marks);
  const contribution = {
    evaluatorUser: evaluatorUserId,
    evaluatorName,
    evaluatorRole,
    content: marks.content,
    visuals: marks.visuals,
    presentationSkills: marks.presentationSkills,
    organization: marks.organization,
    handlingOfQuestions: marks.handlingOfQuestions,
    modernToolUsage: Number(marks.modernToolUsage) || 0,
    ethics: Number(marks.ethics) || 0,
    reportScore: marks.reportScore,
    presentationAvg: presAvg,
    internalTotal: contribInternal,
    remarks: remarks || '',
    submittedAt: new Date(),
  };

  const doc = await FinalGrade.findOne({ studentUser: studentId });
  const existing = doc ? getContributionList(doc) : [];
  const merged = existing.filter((e) => String(e.evaluatorUser) !== String(evaluatorUserId));
  merged.push(contribution);

  const agg = aggregateFromContributions(merged);
  const externalTotal = industrialStats.externalOutOf50;
  const grandTotal = externalTotal + agg.internalTotal;
  const grade = letterGrade(grandTotal);
  const subdocs = merged.map(toSubdoc);

  if (doc) {
    doc.studentName = studentName;
    doc.supervisorUser = supervisorOwnerUserId;
    doc.supervisorName = supervisorOwnerName;
    doc.externalTotal = externalTotal;
    doc.internalEvaluations = subdocs;
    doc.content = agg.content;
    doc.visuals = agg.visuals;
    doc.presentationSkills = agg.presentationSkills;
    doc.organization = agg.organization;
    doc.handlingOfQuestions = agg.handlingOfQuestions;
    doc.modernToolUsage = agg.modernToolUsage;
    doc.ethics = agg.ethics;
    doc.reportScore = agg.reportScore;
    doc.presentationAvg = agg.presentationAvg;
    doc.internalTotal = agg.internalTotal;
    doc.grandTotal = grandTotal;
    doc.grade = grade;
    if (remarks !== undefined) doc.remarks = remarks;
    await doc.save();
    return doc;
  }

  const newDoc = new FinalGrade({
    studentUser: studentId,
    studentName,
    supervisorUser: supervisorOwnerUserId,
    supervisorName: supervisorOwnerName,
    externalTotal,
    internalEvaluations: subdocs,
    content: agg.content,
    visuals: agg.visuals,
    presentationSkills: agg.presentationSkills,
    organization: agg.organization,
    handlingOfQuestions: agg.handlingOfQuestions,
    modernToolUsage: agg.modernToolUsage,
    ethics: agg.ethics,
    reportScore: agg.reportScore,
    presentationAvg: agg.presentationAvg,
    internalTotal: agg.internalTotal,
    grandTotal,
    grade,
    remarks: remarks || '',
  });
  await newDoc.save();
  return newDoc;
}

module.exports = { upsertInternalFinalContribution };
