import type { Student } from '@/types';

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
