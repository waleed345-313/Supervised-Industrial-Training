/** Merge specialization labels onto a student record (union, de-duplicated). */
function mergeStudentSpecializations(studentDoc, labels) {
  if (!studentDoc || !Array.isArray(labels) || labels.length === 0) return;
  const incoming = labels.map((s) => String(s).trim()).filter(Boolean);
  if (incoming.length === 0) return;

  const existing = Array.isArray(studentDoc.specializations)
    ? studentDoc.specializations.map((s) => String(s).trim()).filter(Boolean)
    : studentDoc.specialization
      ? String(studentDoc.specialization)
          .split(';')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

  const merged = [...new Set([...existing, ...incoming])];
  studentDoc.specializations = merged;
  studentDoc.specialization = merged.join('; ');
}

function studentSpecializationsFromDoc(doc) {
  if (!doc) return [];
  if (Array.isArray(doc.specializations) && doc.specializations.length > 0) {
    return doc.specializations.map((s) => String(s).trim()).filter(Boolean);
  }
  if (doc.specialization) {
    return String(doc.specialization)
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

module.exports = { mergeStudentSpecializations, studentSpecializationsFromDoc };
