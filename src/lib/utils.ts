import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow as dateFnsFormatDistanceToNow } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDistanceToNow(date: Date): string {
  return dateFnsFormatDistanceToNow(date, { addSuffix: true });
}

/** Industrial / external component out of 50 (aligned with supervisor “My Students” totalScore). */
export function industrialExternalFromStudent(student: {
  industrialExternalTotal?: number;
  totalScore?: number;
}): number {
  if (typeof student.industrialExternalTotal === 'number') return student.industrialExternalTotal;
  if (typeof student.totalScore === 'number') return student.totalScore;
  return 0;
}
