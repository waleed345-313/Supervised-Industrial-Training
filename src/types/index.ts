export type UserRole = 
  | 'admin'
  | 'manager_placements'
  | 'university_focal'
  | 'academic_supervisor'
  | 'industrial_supervisor'
  | 'company_focal'
  | 'evaluation_panel'
  | 'student';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  department?: string;
  username?: string;
  password?: string;
  companyId?: string; // company_focal + industrial_supervisor (registered company)
  // for CNIC verification (company focals)
  cnicNumber?: string;
  cnicFrontUrl?: string;
  cnicBackUrl?: string;
}

/** One industrial-supervisor monthly evaluation slot (panel API). */
export interface IndustrialMonthlyEvaluationRow {
  monthKey: string;
  month: string;
  score: number;
  maxScore: number;
  /** Share of the 50-point external total for this month (12.5 each). */
  weightedOutOf125?: number;
  evaluatorName: string;
}

export interface Student extends User {
  role: 'student';
  studentId: string;
  cgpa: number;
  specialization: string;
  applicationCount: number;
  maxApplications: number;
  currentStatus: 'not_applied' | 'applied' | 'shortlisted' | 'allocated' | 'rejected' | 'completed';
  allocatedCompany?: string;
  shortlistedCompanyName?: string;
  industrialSupervisorId?: string;
  industrialSupervisorName?: string;
  academicSupervisorId?: string;
  academicSupervisorName?: string;
  progress?: number;
  monthsCompleted?: number;
  totalMonths?: number;
  progressOutOf50?: number;
  totalWeightage?: number;
  /** Industrial 4-month evaluations complete (50 marks) — gate for final internal grading */
  industrialMarkingComplete?: boolean;
  industrialExternalTotal?: number;
  industrialMonthsCompleted?: number;
  /** Latest industrial monthly rows (chronological), up to four. */
  industrialMonthlyEvaluations?: IndustrialMonthlyEvaluationRow[];
  /** Averaged internal total from final grade sheet(s), out of 50. */
  internalTotalFromGrade?: number;
  /** External (industrial months, /50) + internal (/50), capped at 100. */
  progressOutOf100?: number;
  batch?: string;
  section?: string;
  // national ID (CNIC) for student
  cnicNumber?: string;
  gender?: 'Male' | 'Female' | 'Other';
}

export interface Company {
  id: string;
  name: string;
  industry: string;
  location: string;
  website: string;
  description: string;
  logo?: string;
  contactPerson: string;
  contactEmail: string;
  supervisorId?: string;
  isActive: boolean;
}

export interface Internship {
  id: string;
  title: string;
  company: Company;
  description: string;
  specializations: string[];
  location: string;
  duration: string;
  seats: number;
  seatsFilled?: number;
  applicationsCount: number;
  status: 'open' | 'closed' | 'filled';
  postedDate: string;
  deadline?: string;
  requirements?: string[];
  cgpa?: '3.5+' | '3.0+' | '2.5+' | '2.0+';
  gender?: 'Male' | 'Female' | 'Customized';
  interview?: 'Yes' | 'No';
}

export interface Application {
  id: string;
  studentId: string;
  studentName: string;
  internshipId: string;
  internshipTitle: string;
  companyName: string;
  status: 'pending' | 'shortlisted' | 'allocated' | 'rejected' | 'exhaust';
  appliedDate: string;
  remarks?: string;
  studentCGPA?: string;
  /** Placement Office replacement routing — shown to company focal as a labeled application */
  isReplacement?: boolean;
}

export interface ProgressReport {
  id: string;
  studentId: string;
  studentName: string;
  month: string;
  submittedDate: string;
  status: 'pending' | 'reviewed' | 'approved';
  industrialRemarks?: string;
  academicRemarks?: string;
  summary: string;
}

export interface Evaluation {
  id: string;
  studentId: string;
  studentName: string;
  evaluatorId: string;
  evaluatorName: string;
  type: 'monthly' | 'final';
  month?: string;
  scores?: Record<string, number>;
  score: number;
  maxScore: number;
  remarks: string;
  date: string;
}

export interface SupervisorFeedback {
  id: string;
  studentId: string;
  studentName: string;
  supervisorId: string;
  supervisorName: string;
  month?: string;
  type: string;
  message: string;
  status: string;
  sentAt: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  date: string;
  read: boolean;
}

export type StudentDocumentApplicationSlot = 'priority1' | 'priority2' | 'replacement' | 'shuffle';

export interface Document {
  id: string;
  name: string;
  type:
    | 'acceptance_letter'
    | 'completion_letter'
    | 'completion_sit_1'
    | 'completion_sit_2'
    | 'attendance_sheet'
    | 'guideline'
    | 'report'
    | 'resume';
  uploadedBy: string;
  uploadedDate: string;
  url: string;
  studentName?: string;
  studentUserId?: string;
  applicationId?: string;
  /** Standard vs replacement routing — set for student-upload docs from GET /documents/student/me */
  applicationSlot?: StudentDocumentApplicationSlot;
  internshipTitle?: string;
  companyName?: string;
}
