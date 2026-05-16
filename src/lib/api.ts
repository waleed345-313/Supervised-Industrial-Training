export const API_BASE = (import.meta.env.VITE_API_BASE as string) || 'http://localhost:5000';

export function documentFilePublicUrl(relativeUrl: string) {
  if (!relativeUrl) return '';
  if (relativeUrl.startsWith('http')) return relativeUrl;
  return `${API_BASE}${relativeUrl}`;
}

export async function getCompanyDocuments() {
  return request('/api/documents/company/me');
}

export async function uploadCompanyDocument(formData: FormData) {
  const token = localStorage.getItem('sit_portal_token');
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}/api/documents/company/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || res.statusText);
  }
  return res.json();
}

export function getDocumentDownloadUrl(documentId: string) {
  return `${API_BASE}/api/documents/download/${documentId}`;
}

/** Browser navigation (e.g. window.open) does not send Authorization — use these instead. */
export async function fetchDocumentBlob(documentId: string): Promise<Blob> {
  const token = localStorage.getItem('sit_portal_token');
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}/api/documents/download/${documentId}`, { headers });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || res.statusText);
  }
  return res.blob();
}

export async function openDocumentInNewTab(documentId: string) {
  const blob = await fetchDocumentBlob(documentId);
  const url = URL.createObjectURL(blob);
  const w = window.open(url, '_blank', 'noopener,noreferrer');
  if (!w) {
    URL.revokeObjectURL(url);
    throw new Error('Popup blocked — allow popups for this site.');
  }
  setTimeout(() => URL.revokeObjectURL(url), 120_000);
}

export async function downloadDocumentFile(documentId: string, filename: string) {
  const blob = await fetchDocumentBlob(documentId);
  const url = URL.createObjectURL(blob);
  const safe = filename.replace(/[<>:"/\\|?*]/g, '_').slice(0, 180) || 'document';
  const a = document.createElement('a');
  a.href = url;
  a.download = safe;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function deleteCompanyDocument(id: string) {
  return request(`/api/documents/${id}`, { method: 'DELETE' });
}

export async function getStudentDocuments() {
  return request('/api/documents/student/me');
}

export async function getStudentNotifications() {
  return request('/api/notifications/student/me');
}

export async function markNotificationAsRead(id: string) {
  return request(`/api/notifications/student/${id}/read`, {
    method: 'POST',
  });
}

export async function getFocalAnnouncements() {
  return request('/api/focal/announcements');
}

export async function createAnnouncement(data: {
  title: string;
  content: string;
  targetRoles: string[];
  priority: 'low' | 'normal' | 'high';
}) {
  return request('/api/focal/announcements', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAnnouncement(id: string, data: {
  title?: string;
  content?: string;
  status?: 'active' | 'archived';
  priority?: 'low' | 'normal' | 'high';
  targetRoles?: string[];
}) {
  return request(`/api/focal/announcements/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteAnnouncement(id: string) {
  return request(`/api/focal/announcements/${id}`, {
    method: 'DELETE',
  });
}

export async function getSupervisorDocuments() {
  return request('/api/documents/supervisor/me');
}

export async function getSupervisorStudents() {
  return request('/api/supervisor/students');
}

export async function getSupervisorFinalGradingStudents() {
  return request('/api/supervisor/final-grading-students');
}

export async function getSupervisorAllStudents() {
  return request('/api/supervisor/all-students');
}

export async function getSupervisorEvaluations() {
  return request('/api/supervisor/evaluations');
}

export async function getIndustrialEvaluations() {
  return request('/api/evaluations/industrial/me');
}

export async function submitIndustrialEvaluation(data: {
  studentId: string;
  month: string;
  scores: Record<string, number>;
  remarks: string;
}) {
  return request('/api/evaluations/industrial/me', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getIndustrialFeedback(params?: { month?: string }) {
  const qs = new URLSearchParams();
  if (params?.month) qs.set('month', params.month);
  const suffix = qs.toString();
  return request(`/api/evaluations/industrial/me/feedback${suffix ? `?${suffix}` : ''}`);
}

export async function submitEvaluation(data: {
  studentId: string;
  month: string;
  scores: Record<string, number>;
  remarks: string;
}) {
  return request('/api/supervisor/evaluations', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getSupervisorProgressReports(params?: { studentId?: string; month?: string }) {
  const qs = new URLSearchParams();
  if (params?.studentId) qs.set('studentId', params.studentId);
  if (params?.month) qs.set('month', params.month);
  const suffix = qs.toString();
  return request(`/api/supervisor/progress-reports${suffix ? `?${suffix}` : ''}`);
}

export async function getSupervisorMonthlyEvaluations(params?: { studentId?: string; month?: string }) {
  const qs = new URLSearchParams();
  if (params?.studentId) qs.set('studentId', params.studentId);
  if (params?.month) qs.set('month', params.month);
  const suffix = qs.toString();
  return request(`/api/supervisor/monthly-evaluations${suffix ? `?${suffix}` : ''}`);
}

export async function updateProgressReport(
  reportId: string,
  data: { status?: string; academicRemarks?: string }
) {
  return request(`/api/supervisor/progress-reports/${reportId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function getSupervisorFinalGrades() {
  return request('/api/supervisor/final-grades');
}

export async function submitFinalGrade(data: {
  studentId: string;
  content: number;
  visuals: number;
  presentationSkills: number;
  organization: number;
  handlingOfQuestions: number;
  reportScore: number;
  remarks?: string;
}) {
  return request('/api/supervisor/final-grades', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function exportFinalGrades() {
  const token = localStorage.getItem('sit_portal_token');
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  
  const res = await fetch(`${API_BASE}/api/supervisor/final-grades/export`, { headers });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || res.statusText);
  }
  return res.blob();
}

export async function getSupervisorFeedback() {
  return request('/api/supervisor/feedback');
}

export async function getPanelStudents() {
  return request('/api/panel/students');
}

export async function getPanelEvaluations() {
  return request('/api/panel/evaluations');
}

export async function getPanelFinalGrades() {
  return request('/api/panel/final-grades');
}

export async function getPanelProgressReports() {
  return request('/api/panel/progress-reports');
}

export async function submitPanelFinalGrade(data: {
  studentId: string;
  content: number;
  visuals: number;
  presentationSkills: number;
  organization: number;
  handlingOfQuestions: number;
  modernToolUsage: number;
  ethics: number;
  reportScore: number;
  remarks?: string;
}) {
  return request('/api/panel/final-grades', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function sendFeedback(data: {
  studentId: string;
  type: string;
  message: string;
  month?: string;
}) {
  return request('/api/supervisor/feedback', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getFocalDocuments() {
  return request('/api/documents/focal/me');
}

export async function getFocalFinalGrading() {
  return request('/api/focal/final-grading');
}

async function request(path: string, options: RequestInit = {}) {
  const url = `${API_BASE}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  const token = localStorage.getItem('sit_portal_token');
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json();
}

export async function login(email: string, password: string) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function register(data: any) {
  return request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getUsers() {
  return request('/api/users');
}

export async function getUserById(id: string) {
  return request(`/api/users/${id}`);
}

export async function createUser(data: any) {
  // Prefer auth register endpoint for creating users with password
  return request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateUser(id: string, data: any) {
  return request(`/api/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteUser(id: string) {
  return request(`/api/users/${id}`, {
    method: 'DELETE',
  });
}

export async function getCompanies() {
  return request('/api/companies');
}

export async function createCompany(data: any) {
  return request('/api/companies', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCompany(id: string, data: any) {
  return request(`/api/companies/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function assignSupervisor(companyId: string, supervisorId: string) {
  return request(`/api/companies/${companyId}/assign-supervisor`, {
    method: 'PUT',
    body: JSON.stringify({ supervisorId }),
  });
}

export async function unassignSupervisor(companyId: string) {
  return request(`/api/companies/${companyId}/unassign-supervisor`, {
    method: 'PUT',
  });
}

export async function deleteCompany(id: string) {
  return request(`/api/companies/${id}`, {
    method: 'DELETE',
  });
}

export async function getStudents() {
  return request('/api/students');
}

export async function getReplacementCandidates() {
  return request('/api/placements/replacement/candidates');
}

export async function getReplacementVacancies(options?: { excludeForStudent?: string; includeFilled?: boolean }) {
  const params = new URLSearchParams();
  if (options?.excludeForStudent) params.set('excludeForStudent', options.excludeForStudent);
  if (options?.includeFilled) params.set('includeFilled', '1');
  const qs = params.toString() ? `?${params.toString()}` : '';
  return request(`/api/placements/replacement/vacancies${qs}`);
}

export async function releaseReplacementAllocations(studentUserIds: string[]) {
  return request('/api/placements/replacement/release-allocations', {
    method: 'POST',
    body: JSON.stringify({ studentUserIds }),
  });
}

export async function submitReplacementApplication(data: { studentUserId: string; internshipId: string; mode?: 'replace' | 'change' }) {
  return request('/api/placements/replacement/submit', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function backfillReplacementDocuments(applicationId: string) {
  return request('/api/placements/replacement/backfill-documents', {
    method: 'POST',
    body: JSON.stringify({ applicationId }),
  });
}

export async function getReplacementEligibilityMe(): Promise<{ eligible: boolean; reason: string | null }> {
  return request('/api/placements/replacement/eligibility/me');
}

export async function getApplications() {
  return request('/api/applications');
}

export async function getStudentApplications() {
  return request('/api/applications/student/me');
}

export async function getProgressReports() {
  return request('/api/progress-reports');
}

export async function getApplicationDeadline() {
  return request('/api/settings/application-deadline');
}

export async function setApplicationDeadline(value: string) {
  return request('/api/settings/application-deadline', {
    method: 'PUT',
    body: JSON.stringify({ value }),
  });
}

export async function getApplicationsForMyCompany() {
  return request('/api/applications/company/me');
}

export async function updateApplication(id: string, data: Record<string, unknown>) {
  return request(`/api/applications/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function getStudentsForMyCompany() {
  return request('/api/students/company/me');
}

export async function getCompanyFeedbackForCompany() {
  return request('/api/company-feedback/me');
}

export async function getCompanyFeedbackForStudent(studentId: string) {
  return request(`/api/company-feedback/student/${encodeURIComponent(studentId)}`);
}

export async function submitCompanyFeedback(data: {
  studentId: string;
  performanceRating: number;
  attendanceRating: number;
  professionalismRating: number;
  technicalSkillsRating: number;
  communicationRating: number;
  remarks?: string;
  recommendation: string;
}) {
  return request('/api/company-feedback/me', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function assignStudentsToIndustrialSupervisor(
  supervisorId: string,
  studentUserIds: string[]
) {
  return request('/api/students/company/assign-industrial', {
    method: 'PUT',
    body: JSON.stringify({ supervisorId, studentUserIds }),
  });
}

export async function reassignStudentsToIndustrialSupervisor(
  oldSupervisorId: string,
  newSupervisorId: string,
  studentUserIds: string[]
) {
  return request('/api/students/company/reassign-industrial', {
    method: 'PUT',
    body: JSON.stringify({ oldSupervisorId, newSupervisorId, studentUserIds }),
  });
}

export async function getInternships(options?: { openOnly?: boolean; studentGender?: string }) {
  const params = new URLSearchParams();
  if (options?.openOnly) params.append('openOnly', '1');
  if (options?.studentGender) params.append('studentGender', options.studentGender);
  const q = params.toString() ? `?${params.toString()}` : '';
  return request(`/api/internships${q}`);
}

export async function getInternshipsForMyCompany() {
  return request('/api/internships/company/me');
}

export async function createApplication(data: Record<string, unknown>) {
  return request('/api/applications', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getMessageThreads() {
  return request('/api/messages/threads');
}

export async function getThreadMessages(withUserId: string, markRead = false) {
  const url = `/api/messages/thread/${withUserId}?markRead=${encodeURIComponent(String(markRead))}`;
  return request(url);
}

export async function sendMessage(data: { toUserId: string; subject: string; content: string; replyTo?: string; attachments?: any[] }) {
  return request('/api/messages', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function sendMessageWithAttachments(formData: FormData) {
  const token = localStorage.getItem('sit_portal_token');
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}/api/messages`, {
    method: 'POST',
    headers,
    body: formData,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || res.statusText);
  }
  return res.json();
}

export async function createGroupConversation(data: { name: string; participantIds: string[] }) {
  return request('/api/messages/groups', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getGroupConversations() {
  return request('/api/messages/groups');
}

export async function getGroupMessages(groupId: string, markRead = false) {
  const url = `/api/messages/groups/${groupId}/messages?markRead=${encodeURIComponent(String(markRead))}`;
  return request(url);
}

export async function sendGroupMessage(groupId: string, data: { content: string; subject?: string; attachments?: any[] }) {
  return request(`/api/messages/groups/${groupId}/messages`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function markMessagesAsRead(payload: { withUserId?: string; groupId?: string }) {
  return request('/api/messages/read', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function sendGroupMessageWithAttachments(groupId: string, formData: FormData) {
  const token = localStorage.getItem('sit_portal_token');
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}/api/messages/groups/${groupId}/messages`, {
    method: 'POST',
    headers,
    body: formData,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || res.statusText);
  }
  return res.json();
}

export async function createInternship(data: any) {
  return request('/api/internships', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateInternship(id: string, data: any) {
  return request(`/api/internships/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteInternship(id: string) {
  return request(`/api/internships/${id}`, {
    method: 'DELETE',
  });
}

export async function uploadStudentResume(formData: FormData) {
  const token = localStorage.getItem('sit_portal_token');
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}/api/documents/student/resume`, {
    method: 'POST',
    headers,
    body: formData,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || res.statusText);
  }
  return res.json();
}

export async function getApplicationDocuments(applicationId: string) {
  return request(`/api/documents/application/${applicationId}`);
}

export default { 
  login, 
  register, 
  getUsers, 
  getUserById, 
  createUser,
  updateUser, 
  deleteUser,
  getCompanies, 
  getStudents,
  getReplacementCandidates,
  getReplacementVacancies,
  submitReplacementApplication,
  backfillReplacementDocuments,
  getReplacementEligibilityMe,
  getApplications,
  getStudentApplications,
  getApplicationsForMyCompany,
  updateApplication,
  getStudentsForMyCompany,
  getCompanyFeedbackForCompany,
  getCompanyFeedbackForStudent,
  submitCompanyFeedback,
  assignStudentsToIndustrialSupervisor,
  reassignStudentsToIndustrialSupervisor,
  getInternships,
  getInternshipsForMyCompany,
  createApplication, 
  getCompanyDocuments,
  getStudentDocuments,
  getSupervisorDocuments,
  getFocalDocuments,
  uploadCompanyDocument,
  deleteCompanyDocument,
  fetchDocumentBlob,
  openDocumentInNewTab,
  downloadDocumentFile,
  getStudentNotifications,
  markNotificationAsRead,
  getMessageThreads,
  getThreadMessages,
  sendMessage,
  sendMessageWithAttachments,
  createGroupConversation,
  getGroupConversations,
  getGroupMessages,
  markMessagesAsRead,
  sendGroupMessage,
  sendGroupMessageWithAttachments,
  createInternship,
  updateInternship,
  deleteInternship,
  uploadStudentResume,
  getApplicationDocuments,
  getIndustrialEvaluations,
  getIndustrialFeedback,
  submitIndustrialEvaluation,
};
