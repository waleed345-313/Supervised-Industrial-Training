/** Display string for student specialization(s) across the app. */
export function formatStudentSpecializations(source?: {
  specialization?: string;
  specializations?: string[];
}): string {
  const list =
    source?.specializations?.filter(Boolean) ??
    (source?.specialization
      ? source.specialization.split(';').map((s) => s.trim()).filter(Boolean)
      : []);
  if (list.length === 0) return '—';
  return list.join('; ');
}

export function studentSpecializationList(source?: {
  specialization?: string;
  specializations?: string[];
}): string[] {
  if (source?.specializations?.length) {
    return source.specializations.filter(Boolean);
  }
  if (source?.specialization?.trim()) {
    return source.specialization
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}
