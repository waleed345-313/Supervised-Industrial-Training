export type SpecializationOption = { id: string; label: string };

export const SPECIALIZATION_OPTIONS: SpecializationOption[] = [
  { id: 'cp', label: 'Computer Programming/ Software Development' },
  { id: 'db', label: 'Database Management/ Administration/ Programming' },
  { id: 'na', label: 'Network Administration/ Programming/ Management' },
  { id: 'wp', label: 'Web Programming/ Development/ E-Commerce' },
  { id: 'ai', label: 'Artificial intelligence/ Data Science/ Machine Learning' },
  { id: 'ip', label: 'Image Processing/ Game Programming/ Image Analysis' },
  { id: 'ma', label: 'Mobile App Development/ Programming/ Management/ Troubleshooting' },
  { id: 'cs', label: 'Cyber Security/ Digital Forensics/ Network Security' },
  { id: 'ux', label: 'User Interface/ User Experience Design/ Development' },
  { id: 'qa', label: 'Software Quality Assurance' },
  { id: 'hw', label: 'Hardware/ System Programming/ Computer Architecture/ OS' },
  { id: 'ot', label: 'Any other domain related to information engineering technology' },
];

export function specIdsToLabels(ids: string[]): string[] {
  return ids.map((id) => SPECIALIZATION_OPTIONS.find((s) => s.id === id)?.label || id);
}

export function labelsToSpecIds(labels: string[]): string[] {
  return labels.map((label) => SPECIALIZATION_OPTIONS.find((s) => s.label === label)?.id || label);
}
