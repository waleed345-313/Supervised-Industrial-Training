const { aggregateFromContributions, letterGrade } = require('./finalGradeAggregate');

function toPlainContribution(e) {
  if (!e) return null;
  return {
    evaluatorUser: e.evaluatorUser ? String(e.evaluatorUser) : undefined,
    evaluatorName: e.evaluatorName || '',
    evaluatorRole: e.evaluatorRole || 'academic_supervisor',
    content: Number(e.content),
    visuals: Number(e.visuals),
    presentationSkills: Number(e.presentationSkills),
    organization: Number(e.organization),
    handlingOfQuestions: Number(e.handlingOfQuestions),
    modernToolUsage: Number(e.modernToolUsage) || 0,
    ethics: Number(e.ethics) || 0,
    reportScore: Number(e.reportScore),
    presentationAvg: Number(e.presentationAvg),
    internalTotal: Number(e.internalTotal),
    remarks: e.remarks || '',
    submittedAt: e.submittedAt,
  };
}

/**
 * Contributions used for averaging: persisted array or legacy single row on the document.
 */
function getContributionList(doc) {
  const persisted = Array.isArray(doc.internalEvaluations) ? doc.internalEvaluations : [];
  const normalizedPersisted = persisted.map((x) =>
    toPlainContribution(x.toObject ? x.toObject() : x)
  );

  if (normalizedPersisted.length > 0) {
    return normalizedPersisted.filter(Boolean);
  }

  if (
    doc.supervisorUser &&
    typeof doc.internalTotal === 'number' &&
    doc.internalTotal > 0 &&
    typeof doc.content === 'number'
  ) {
    return [
      {
        evaluatorUser: String(doc.supervisorUser),
        evaluatorName: doc.supervisorName || '',
        evaluatorRole: 'academic_supervisor',
        content: Number(doc.content),
        visuals: Number(doc.visuals),
        presentationSkills: Number(doc.presentationSkills),
        organization: Number(doc.organization),
        handlingOfQuestions: Number(doc.handlingOfQuestions),
        modernToolUsage: Number(doc.modernToolUsage) || 0,
        ethics: Number(doc.ethics) || 0,
        reportScore: Number(doc.reportScore),
        presentationAvg: Number(doc.presentationAvg),
        internalTotal: Number(doc.internalTotal),
        remarks: doc.remarks || '',
        submittedAt: doc.submittedAt || doc.updatedAt,
      },
    ];
  }

  return [];
}

function serializeFinalGrade(doc, industrialStats) {
  const plain = doc.toObject ? doc.toObject() : { ...doc };
  const contributions = getContributionList(plain);
  const agg = aggregateFromContributions(contributions);
  const externalTotal = Number(industrialStats.externalOutOf50);
  const internalTotal = contributions.length > 0 ? agg.internalTotal : 0;
  const grandTotal = externalTotal + internalTotal;
  const grade = letterGrade(grandTotal);

  return {
    ...plain,
    _id: String(plain._id),
    studentUser: String(plain.studentUser),
    supervisorUser: plain.supervisorUser ? String(plain.supervisorUser) : undefined,
    externalTotal,
    content: agg.contributorCount ? agg.content : plain.content,
    visuals: agg.contributorCount ? agg.visuals : plain.visuals,
    presentationSkills: agg.contributorCount ? agg.presentationSkills : plain.presentationSkills,
    organization: agg.contributorCount ? agg.organization : plain.organization,
    handlingOfQuestions: agg.contributorCount ? agg.handlingOfQuestions : plain.handlingOfQuestions,
    modernToolUsage: agg.contributorCount ? agg.modernToolUsage : plain.modernToolUsage ?? 0,
    ethics: agg.contributorCount ? agg.ethics : plain.ethics ?? 0,
    reportScore: agg.contributorCount ? agg.reportScore : plain.reportScore,
    presentationAvg: agg.contributorCount ? agg.presentationAvg : plain.presentationAvg,
    internalTotal: Number(internalTotal.toFixed(2)),
    grandTotal: Number(grandTotal.toFixed(2)),
    grade,
    internalEvaluations: contributions,
    contributorCount: contributions.length,
    industrialMonthsCompleted: industrialStats.monthsCompleted,
    industrialMarkingComplete: industrialStats.complete,
  };
}

module.exports = {
  serializeFinalGrade,
  getContributionList,
};
