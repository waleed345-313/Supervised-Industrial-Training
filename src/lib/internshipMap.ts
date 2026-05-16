import type { Company, Internship } from '@/types';

function toDateStr(d: string | Date | undefined | null): string {
  if (d == null) return '';
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10);
}

export function mapInternshipFromApi(raw: Record<string, unknown>): Internship {
  const c = raw.company as Record<string, unknown> | undefined | null;
  const company: Company = {
    id: String(c?._id ?? c?.id ?? ''),
    name: String(c?.name ?? ''),
    industry: String(c?.industry ?? ''),
    location: String(c?.location ?? ''),
    website: String(c?.website ?? ''),
    description: String(c?.description ?? ''),
    contactPerson: String(c?.contactPerson ?? ''),
    contactEmail: String(c?.contactEmail ?? ''),
    isActive: c?.isActive !== false,
  };

  const specs = raw.specializations;

  return {
    id: String(raw._id ?? raw.id),
    title: String(raw.title ?? ''),
    company,
    description: String(raw.description ?? ''),
    specializations: Array.isArray(specs) ? (specs as string[]) : [],
    location: String(raw.location ?? ''),
    duration: String(raw.duration ?? ''),
    seats: Number(raw.seats ?? 0),
    seatsFilled: Number(raw.seatsFilled ?? 0),
    applicationsCount: Number(raw.applicationsCount ?? 0),
    status: raw.status as Internship['status'],
    postedDate: toDateStr((raw.postedDate ?? raw.createdAt) as Date | string) || toDateStr(new Date()),
    deadline: toDateStr(raw.deadline as Date | string),
    cgpa: (raw.cgpa as Internship['cgpa']) || undefined,
    gender: (raw.gender as Internship['gender']) || undefined,
    interview: (raw.interview as Internship['interview']) || undefined,
  };
}
