import type { Student } from '@/types';

export const PANEL_INTERNAL_MARKS_MAX = 50;
export const HANDLING_OF_QUESTIONS_MAX = 20;

/** Clamp HOQ to 0–20 (legacy records may have been saved out of 30). */
export function clampHandlingOfQuestions(
  value: number | undefined | null,
  fallback = 14
): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(HANDLING_OF_QUESTIONS_MAX, Math.max(0, n));
}

export function clampRubricScore(
  value: number | undefined | null,
  max: number,
  fallback = 0
): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(0, n));
}

export type InternalRubricMarks = {
  content: number;
  visuals: number;
  presentationSkills: number;
  organization: number;
  handlingOfQuestions: number;
  modernToolUsage: number;
  ethics: number;
  reportScore: number;
};

export function presentationAverageFromRubrics(
  marks: Pick<InternalRubricMarks, 'content' | 'visuals' | 'presentationSkills' | 'organization'>
): number {
  return (marks.content + marks.visuals + marks.presentationSkills + marks.organization) / 4;
}

/** Internal total out of 50 from rubric marks (same formula for panel and academic supervisor). */
export function internalTotalFromRubrics(marks: InternalRubricMarks): number {
  return (
    presentationAverageFromRubrics(marks) +
    marks.handlingOfQuestions +
    marks.modernToolUsage +
    marks.ethics +
    marks.reportScore
  );
}

/** Convert panel internal marks (out of 50) to percentage 0–100. */
export function internalMarksToPercent(internalOutOf50: number): number {
  const n = Number(internalOutOf50);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, (n / PANEL_INTERNAL_MARKS_MAX) * 100));
}

/** Letter grade from internal marks out of 50 (percentage bands). */
export function letterGradeFromInternalOutOf50(internalOutOf50: number): string {
  const pct = internalMarksToPercent(internalOutOf50);
  if (pct >= 85) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 75) return 'B+';
  if (pct >= 70) return 'B';
  if (pct >= 65) return 'C+';
  if (pct >= 60) return 'C';
  if (pct >= 55) return 'D+';
  if (pct >= 50) return 'D';
  return 'F';
}

export function gradeBadgeVariant(letter: string): 'default' | 'secondary' | 'destructive' {
  if (letter === 'F' || letter === 'D' || letter === 'D+') return 'destructive';
  if (letter === 'C' || letter === 'C+') return 'secondary';
  return 'default';
}

export interface PanelInternalEvalContribution {
  evaluatorUser: string;
  evaluatorName?: string;
  internalTotal?: number;
}

export interface PanelFinalGradeLike {
  studentUser: string;
  grandTotal?: number;
  externalTotal?: number;
  internalTotal?: number;
  grade?: string;
  internalEvaluations?: PanelInternalEvalContribution[];
}

/** True when this evaluation-panel user has submitted internal marks for the student. */
export function panelMemberHasMarkedStudent(
  studentId: string,
  finalGrades: PanelFinalGradeLike[],
  evaluatorUserId: string | undefined
): boolean {
  if (!evaluatorUserId) return false;
  const grade = finalGrades.find((g) => String(g.studentUser) === String(studentId));
  if (!grade) return false;
  if (grade.internalEvaluations && grade.internalEvaluations.length > 0) {
    return grade.internalEvaluations.some(
      (row) => String(row.evaluatorUser) === String(evaluatorUserId)
    );
  }
  return false;
}

/** Students ready for internal final grading (industrial 4-month marking complete). */
export function studentsEligibleForPanelFinalGrading(students: Student[]): Student[] {
  return students.filter((s) => s.industrialMarkingComplete === true);
}

export function combinedPanelProgressPercent(student: Student): number {
  const ext = Number(student.industrialExternalTotal ?? 0);
  const int = Number(student.internalTotalFromGrade ?? 0);
  if (typeof student.progressOutOf100 === 'number' && Number.isFinite(student.progressOutOf100)) {
    return Math.min(100, Math.round(student.progressOutOf100));
  }
  return Math.min(100, Math.round(ext + int));
}
