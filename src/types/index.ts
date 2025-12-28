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
}

export interface Student extends User {
  role: 'student';
  studentId: string;
  cgpa: number;
  specialization: string;
  applicationCount: number;
  maxApplications: number;
  currentStatus: 'not_applied' | 'applied' | 'shortlisted' | 'allocated' | 'rejected';
  allocatedCompany?: string;
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
  isActive: boolean;
}

export interface Internship {
  id: string;
  title: string;
  company: Company;
  description: string;
  requirements: string[];
  specializations: string[];
  location: string;
  duration: string;
  seats: number;
  applicationsCount: number;
  deadline: string;
  status: 'open' | 'closed' | 'filled';
  postedDate: string;
}

export interface Application {
  id: string;
  studentId: string;
  studentName: string;
  internshipId: string;
  internshipTitle: string;
  companyName: string;
  status: 'pending' | 'shortlisted' | 'allocated' | 'rejected';
  appliedDate: string;
  remarks?: string;
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
  score: number;
  maxScore: number;
  remarks: string;
  date: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  date: string;
  read: boolean;
}

export interface Document {
  id: string;
  name: string;
  type: 'acceptance_letter' | 'completion_letter' | 'guideline' | 'report';
  uploadedBy: string;
  uploadedDate: string;
  url: string;
}
