import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Users, UserPlus, Building2, Eye, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Student, Company, User } from '@/types';
import {
  getCompanies,
  getUsers,
  getSupervisorAllStudents,
  assignSupervisor,
  unassignSupervisor,
  getCompanyFeedbackForStudent,
} from '@/lib/api';

function getCompanyId(company: Company & { _id?: string }) {
  return company.id || String(company._id ?? '');
}

function normalizeCompany(company: Company & { _id?: string }): Company {
  return { ...company, id: getCompanyId(company) };
}

function resolveStudentCompanyId(student: Student & { allocatedCompanyId?: string; shortlistedCompanyId?: string }) {
  if (student.allocatedCompanyId) return student.allocatedCompanyId;
  if (student.shortlistedCompanyId) return student.shortlistedCompanyId;
  return '';
}

function resolveStudentCompanyName(student: Student & { allocatedCompanyId?: string; shortlistedCompanyId?: string }) {
  if (typeof student.allocatedCompany === 'string' && student.allocatedCompany.trim()) return student.allocatedCompany;
  if (typeof student.shortlistedCompanyName === 'string' && student.shortlistedCompanyName.trim()) return student.shortlistedCompanyName;
  return '';
}

type StudentCompanyFeedback = {
  id: string;
  companyName: string;
  focalName: string;
  overallScore: number;
  recommendation: string;
  remarks: string;
  submittedDate: string | null;
  performanceRating: number;
  attendanceRating: number;
  professionalismRating: number;
  technicalSkillsRating: number;
  communicationRating: number;
};

export default function FocalAssignments() {
  const { toast } = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [companyAssignments, setCompanyAssignments] = useState<Record<string, string>>({});
  const [isAssignCompanyOpen, setIsAssignCompanyOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [selectedSupervisor, setSelectedSupervisor] = useState<string>('');
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [studentCompanyFeedback, setStudentCompanyFeedback] = useState<StudentCompanyFeedback[]>([]);
  const [companyFeedbackLoading, setCompanyFeedbackLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);

    const token = localStorage.getItem('sit_portal_token');
    if (!token) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in with your university focal account email and password.',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    const [companiesRes, usersRes, studentsRes] = await Promise.allSettled([
      getCompanies(),
      getUsers(),
      getSupervisorAllStudents(),
    ]);

    let failed = false;

    if (companiesRes.status === 'fulfilled') {
      const normalizedCompanies = (companiesRes.value as (Company & { _id?: string; supervisorId?: string })[])
        .map(normalizeCompany)
        .filter((company) => Boolean(company.id));
      setCompanies(normalizedCompanies);

      const assignments: Record<string, string> = {};
      normalizedCompanies.forEach((company) => {
        const supervisorId =
          company.supervisorId ||
          (company.assignedSupervisor && typeof company.assignedSupervisor === 'object'
            ? String(
                (company.assignedSupervisor as { id?: string; _id?: string }).id ||
                  (company.assignedSupervisor as { id?: string; _id?: string })._id ||
                  ''
              )
            : '');
        if (supervisorId) assignments[company.id] = supervisorId;
      });
      setCompanyAssignments(assignments);
    } else {
      console.error(companiesRes.reason);
      setCompanies([]);
      setCompanyAssignments({});
      failed = true;
    }

    if (usersRes.status === 'fulfilled') {
      setUsers(Array.isArray(usersRes.value) ? usersRes.value : []);
    } else {
      console.error(usersRes.reason);
      setUsers([]);
      failed = true;
    }

    if (studentsRes.status === 'fulfilled') {
      setStudents(Array.isArray(studentsRes.value) ? (studentsRes.value as Student[]) : []);
    } else {
      console.error(studentsRes.reason);
      setStudents([]);
      failed = true;
    }

    if (failed) {
      toast({
        title: 'Error',
        description: 'Failed to load assignment data. Ensure you are signed in and the API server is running.',
        variant: 'destructive',
      });
    }

    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const id = viewingStudent?.id;
    if (!id) {
      setStudentCompanyFeedback([]);
      setCompanyFeedbackLoading(false);
      return;
    }

    let cancelled = false;
    setCompanyFeedbackLoading(true);
    void (async () => {
      try {
        const data = await getCompanyFeedbackForStudent(id);
        if (cancelled) return;
        setStudentCompanyFeedback(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) {
          setStudentCompanyFeedback([]);
          toast({
            title: 'Could not load feedback',
            description: 'Company focal feedback could not be loaded for this student.',
            variant: 'destructive',
          });
        }
      } finally {
        if (!cancelled) setCompanyFeedbackLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [viewingStudent?.id, toast]);

  const academicSupervisors = users.filter(u => u.role === 'academic_supervisor');
  const activeCompanies = companies.filter(c => c.isActive !== false);
  // Include all students that are either shortlisted or allocated to companies
  const allocatedStudents = students.filter(s =>
    s.currentStatus === 'allocated' || s.currentStatus === 'shortlisted'
  );

  const handleAssignCompany = async () => {
    if (!selectedCompany || !selectedSupervisor) {
      toast({
        title: 'Missing Selection',
        description: 'Please select both a company and a supervisor.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await assignSupervisor(selectedCompany, selectedSupervisor);

      // Update local state
      setCompanyAssignments(prev => ({
        ...prev,
        [selectedCompany]: selectedSupervisor,
      }));

      const company = companies.find(c => c.id === selectedCompany);
      const supervisor = academicSupervisors.find(s => s.id === selectedSupervisor);

      toast({
        title: 'Company Assigned',
        description: `${company?.name} has been assigned to ${supervisor?.name}.`,
      });

      setIsAssignCompanyOpen(false);
      setSelectedCompany('');
      setSelectedSupervisor('');
    } catch (error: any) {
      console.error('Error assigning supervisor:', error);
      const errorMessage = error?.message || 'Failed to assign supervisor. Please try again.';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const handleUnassignCompany = async (companyId: string) => {
    try {
      await unassignSupervisor(companyId);

      // Update local state
      setCompanyAssignments(prev => {
        const updated = { ...prev };
        delete updated[companyId];
        return updated;
      });

      const company = companies.find(c => c.id === companyId);

      toast({
        title: 'Company Unassigned',
        description: `${company?.name} has been unassigned from the supervisor.`,
      });
    } catch (error) {
      console.error('Error unassigning supervisor:', error);
      toast({
        title: 'Error',
        description: 'Failed to unassign supervisor. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const getSupervisorForCompany = (companyId: string) => {
    const supervisorId = companyAssignments[companyId];
    return academicSupervisors.find(s => s.id === supervisorId);
  };

  const getCompaniesForSupervisor = (supervisorId: string) => {
    return companies.filter(c => companyAssignments[c.id] === supervisorId);
  };

  const handleViewStudentDetails = (student: Student) => {
    setViewingStudent(student);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <PageHeader
          title="Supervisor Assignments"
          description="Assign Academic Supervisors to companies for SIT supervision"
          action={
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setSelectedCompany('');
                  setSelectedSupervisor('');
                  setIsAssignCompanyOpen(true);
                }}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Assign Company
              </Button>
            </div>
          }
        />

        {/* Company to Supervisor Assignments (FR-5) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Company Assignments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading companies...</span>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Industry</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Assigned Supervisor</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeCompanies.map((company) => {
                    const supervisor = getSupervisorForCompany(company.id);
                    return (
                      <TableRow key={company.id}>
                        <TableCell className="font-medium">{company.name}</TableCell>
                        <TableCell className="text-muted-foreground">{company.industry}</TableCell>
                        <TableCell className="text-muted-foreground">{company.location}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {supervisor?.name || <span className="text-warning">Not Assigned</span>}
                        </TableCell>
                        <TableCell>
                          {supervisor ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUnassignCompany(company.id)}
                            >
                              Unassign
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedCompany(company.id);
                                setSelectedSupervisor(companyAssignments[company.id] || '');
                                setIsAssignCompanyOpen(true);
                              }}
                            >
                              Assign
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Student Assignments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Student Allocations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Academic Supervisor</TableHead>
                  <TableHead>Specialization</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allocatedStudents.map((student) => {
                  const studentCompanyId = resolveStudentCompanyId(student as Student & { allocatedCompanyId?: string; shortlistedCompanyId?: string });
                  const studentCompanyName = resolveStudentCompanyName(student as Student & { allocatedCompanyId?: string; shortlistedCompanyId?: string });
                  const company = companies.find(c => c.id === studentCompanyId) || companies.find(c => c.name === studentCompanyName);
                  const supervisor = company ? getSupervisorForCompany(company.id) : null;
                  return (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell className="text-muted-foreground">{company?.name || 'N/A'}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {supervisor?.name || <span className="text-warning">Not Assigned</span>}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{student.specialization}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => handleViewStudentDetails(student)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Academic Supervisors Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Academic Supervisors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supervisor</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Assigned Companies</TableHead>
                  <TableHead>Students</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {academicSupervisors.map((supervisor) => {
                  const assignedCompanies = getCompaniesForSupervisor(supervisor.id);
                  const assignedCompanyIds = new Set(assignedCompanies.map((c) => c.id));
                  // Count students mapped to those assigned companies
                  const studentCount = allocatedStudents.filter(s => {
                    const sid = resolveStudentCompanyId(s as Student & { allocatedCompanyId?: string; shortlistedCompanyId?: string });
                    if (sid && assignedCompanyIds.has(sid)) return true;
                    const sname = resolveStudentCompanyName(s as Student & { allocatedCompanyId?: string; shortlistedCompanyId?: string });
                    const byName = assignedCompanies.some((c) => c.name === sname);
                    return byName;
                  }).length;
                  return (
                    <TableRow key={supervisor.id}>
                      <TableCell className="font-medium">{supervisor.name}</TableCell>
                      <TableCell className="text-muted-foreground">{supervisor.department}</TableCell>
                      <TableCell className="text-muted-foreground">{supervisor.email}</TableCell>
                      <TableCell>
                        {assignedCompanies.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {assignedCompanies.map(c => (
                              <Badge key={c.id} variant="secondary" className="text-xs">
                                {c.name}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">None</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{studentCount}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Assign Company Dialog */}
        <Dialog
          open={isAssignCompanyOpen}
          onOpenChange={(open) => {
            setIsAssignCompanyOpen(open);
            if (!open) {
              setSelectedCompany('');
              setSelectedSupervisor('');
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Company to Academic Supervisor</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Company</Label>
                <Select
                  value={selectedCompany || undefined}
                  onValueChange={(value) => setSelectedCompany(String(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a company" />
                  </SelectTrigger>
                  <SelectContent position="popper" align="start">
                    {activeCompanies.map((company) => (
                      <SelectItem key={company.id} value={String(company.id)}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Academic Supervisor</Label>
                <Select
                  value={selectedSupervisor || undefined}
                  onValueChange={(value) => setSelectedSupervisor(String(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a supervisor" />
                  </SelectTrigger>
                  <SelectContent position="popper" align="start">
                    {academicSupervisors.map((supervisor) => (
                      <SelectItem key={supervisor.id} value={String(supervisor.id)}>
                        {supervisor.name} ({supervisor.department})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAssignCompanyOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAssignCompany}>
                Assign
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Student Details Dialog */}
        <Dialog open={!!viewingStudent} onOpenChange={() => setViewingStudent(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{viewingStudent?.name} - Student Details</DialogTitle>
            </DialogHeader>
            {viewingStudent && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Student ID</Label>
                    <p className="text-sm text-muted-foreground">{viewingStudent.studentId}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Email</Label>
                    <p className="text-sm text-muted-foreground">{viewingStudent.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Specialization</Label>
                    <p className="text-sm text-muted-foreground">{viewingStudent.specialization}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">CGPA</Label>
                    <p className="text-sm text-muted-foreground">{viewingStudent.cgpa}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Allocated Company</Label>
                  <p className="text-sm text-muted-foreground">{viewingStudent.allocatedCompany || 'Not allocated'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Applications Submitted</Label>
                  <p className="text-sm text-muted-foreground">{viewingStudent.applicationCount} / {viewingStudent.maxApplications}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Department</Label>
                  <p className="text-sm text-muted-foreground">{viewingStudent.department}</p>
                </div>

                <div className="border-t pt-4 space-y-3">
                  <Label className="text-sm font-medium">Company focal feedback</Label>
                  {companyFeedbackLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading feedback…
                    </div>
                  ) : studentCompanyFeedback.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No feedback from a company focal person has been submitted for this student yet.
                    </p>
                  ) : (
                    <div className="space-y-3 max-h-[240px] overflow-y-auto">
                      {studentCompanyFeedback.map((fb) => (
                        <div
                          key={fb.id}
                          className="rounded-md border bg-muted/30 p-3 space-y-2 text-sm"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-medium">{fb.companyName}</p>
                            <Badge variant={fb.overallScore >= 8 ? 'default' : fb.overallScore >= 6 ? 'secondary' : 'destructive'}>
                              Overall {fb.overallScore.toFixed(1)} / 10
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Submitted
                            {fb.focalName ? ` by ${fb.focalName}` : ''}
                            {fb.submittedDate ? ` · ${fb.submittedDate}` : ''}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">
                            Recommendation: {fb.recommendation.replace(/_/g, ' ')}
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span>Performance: {fb.performanceRating}/10</span>
                            <span>Attendance: {fb.attendanceRating}/10</span>
                            <span>Professionalism: {fb.professionalismRating}/10</span>
                            <span>Technical: {fb.technicalSkillsRating}/10</span>
                            <span>Communication: {fb.communicationRating}/10</span>
                          </div>
                          {fb.remarks?.trim() ? (
                            <div>
                              <p className="text-xs font-medium text-foreground mb-1">Remarks</p>
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{fb.remarks}</p>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
