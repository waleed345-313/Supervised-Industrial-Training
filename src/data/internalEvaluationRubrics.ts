/** Internal final grading rubrics — same order and max marks as evaluation panel / academic supervisor. */
export const INTERNAL_EVALUATION_RUBRICS = [
  { key: 'content', label: 'Content', max: 10 },
  { key: 'visuals', label: 'Visuals', max: 10 },
  { key: 'presentationSkills', label: 'Presentation Skills', max: 10 },
  { key: 'organization', label: 'Organization', max: 10 },
  { key: 'handlingOfQuestions', label: 'Handling of Questions', max: 20 },
  { key: 'modernToolUsage', label: 'Modern Tool Usage', max: 5 },
  { key: 'ethics', label: 'Ethics', max: 5 },
  { key: 'reportScore', label: 'Report Score', max: 10 },
] as const;

export const INTERNAL_PRESENTATION_AVG_MAX = 10;
export const INTERNAL_TOTAL_MAX = 50;

export type InternalEvaluationRubricKey = (typeof INTERNAL_EVALUATION_RUBRICS)[number]['key'];
