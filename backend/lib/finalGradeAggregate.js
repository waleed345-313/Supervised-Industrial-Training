function presentationAvg({ content, visuals, presentationSkills, organization }) {
  return (content + visuals + presentationSkills + organization) / 4;
}

function contributorInternalTotal(fields) {
  const modernToolUsage = Number(fields.modernToolUsage) || 0;
  const ethics = Number(fields.ethics) || 0;
  return (
    presentationAvg(fields) +
    fields.handlingOfQuestions +
    fields.reportScore +
    modernToolUsage +
    ethics
  );
}

function letterGrade(grandTotal) {
  let grade = 'F';
  if (grandTotal >= 85) grade = 'A+';
  else if (grandTotal >= 80) grade = 'A';
  else if (grandTotal >= 75) grade = 'B+';
  else if (grandTotal >= 70) grade = 'B';
  else if (grandTotal >= 65) grade = 'C+';
  else if (grandTotal >= 60) grade = 'C';
  else if (grandTotal >= 55) grade = 'D+';
  else if (grandTotal >= 50) grade = 'D';
  return grade;
}

function aggregateFromContributions(internalEvaluations) {
  if (!internalEvaluations || internalEvaluations.length === 0) {
    return {
      presentationAvg: 0,
      content: 0,
      visuals: 0,
      presentationSkills: 0,
      organization: 0,
      handlingOfQuestions: 0,
      modernToolUsage: 0,
      ethics: 0,
      reportScore: 0,
      internalTotal: 0,
      contributorCount: 0,
    };
  }
  const n = internalEvaluations.length;
  const sum = (key) => internalEvaluations.reduce((s, e) => s + Number(e[key] || 0), 0);
  const internalTotal =
    internalEvaluations.reduce((s, e) => s + Number(e.internalTotal || 0), 0) / n;

  return {
    presentationAvg: sum('presentationAvg') / n,
    content: sum('content') / n,
    visuals: sum('visuals') / n,
    presentationSkills: sum('presentationSkills') / n,
    organization: sum('organization') / n,
    handlingOfQuestions: sum('handlingOfQuestions') / n,
    modernToolUsage: sum('modernToolUsage') / n,
    ethics: sum('ethics') / n,
    reportScore: sum('reportScore') / n,
    internalTotal,
    contributorCount: n,
  };
}

module.exports = {
  presentationAvg,
  contributorInternalTotal,
  letterGrade,
  aggregateFromContributions,
};
