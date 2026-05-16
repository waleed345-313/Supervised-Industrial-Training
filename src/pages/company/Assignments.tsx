import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Users, Eye, Loader2 } from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { Student, User, Company } from '@/types';
import api, { API_BASE } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { io, type Socket } from 'socket.io-client';

export default function CompanyAssignments() {
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Real data states
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [allocatedStudents, setAllocatedStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  // Company -> Academic Supervisor mapping (from company data)
  const [companyAssignments, setCompanyAssignments] = useState<Record<string, string>>({});
  
  const myCompany = companies.find(c => c.id === user?.companyId);
  
  // Academic supervisor assigned to this company (via supervisorId on company)
  const myCompanySupervisorId = user?.companyId ? companyAssignments[user.companyId] : undefined;
  const academicSupervisors = users.filter(u =>
    u.role === 'academic_supervisor' &&
    myCompanySupervisorId === u.id
  );
  
  // Industrial supervisors belonging to this company (via companyId on user)
  const industrialSupervisors = users.filter(u => 
    u.role === 'industrial_supervisor' && 
    u.companyId === user?.companyId
  );
  
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isAssignToIndustrialOpen, setIsAssignToIndustrialOpen] = useState(false);
  const [selectedIndustrialSupervisor, setSelectedIndustrialSupervisor] = useState<string>('');

  // local mapping of industrial supervisor -> student ids assigned
  const [industrialAssignments, setIndustrialAssignments] = useState<Record<string, string[]>>({});

  // Fetch real data
  const loadData = useCallback(async () => {
    if (!user?.companyId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const [usersData, companiesData, studentsData] = await Promise.all([
        api.getUsers(),
        api.getCompanies(),
        api.getStudentsForMyCompany(),
      ]);
      
      setUsers(usersData || []);
      setCompanies(companiesData || []);
      
      // Show all students with allocated/shortlisted applications
      console.log('Loaded students for assignments:', studentsData);
      setAllocatedStudents(studentsData || []);

      // Build industrial assignments from backend persisted data
      const backendAssignments: Record<string, string[]> = {};
      (studentsData || []).forEach((student: Student) => {
        const supervisorId = student.industrialSupervisorId;
        if (!supervisorId) return;
        if (!backendAssignments[supervisorId]) backendAssignments[supervisorId] = [];
        backendAssignments[supervisorId].push(student.id);
      });
      setIndustrialAssignments(backendAssignments);
      
      // Build company assignments from company data
      const assignments: Record<string, string> = {};
      (companiesData || []).forEach((c: Company & { assignedSupervisor?: { id?: string } | string }) => {
        const supId =
          c.supervisorId ||
          (typeof c.assignedSupervisor === 'object' && c.assignedSupervisor !== null
            ? c.assignedSupervisor.id
            : typeof c.assignedSupervisor === 'string'
              ? c.assignedSupervisor
              : '');
        if (supId) {
          assignments[c.id] = String(supId);
        }
      });
      setCompanyAssignments(assignments);
    } catch (e) {
      console.error(e);
      toast({
        title: 'Could not load assignments data',
        description: 'Check that you are logged in as a company focal.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast, user?.companyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time updates via socket
  useEffect(() => {
    const token = localStorage.getItem('sit_portal_token');
    if (!token || !user?.companyId) return;
    
    const socket: Socket = io(API_BASE, { auth: { token } });
    
    const onCompanyUpdate = (payload: { type?: string }) => {
      if (payload?.type === 'assignments' || payload?.type === 'students') {
        loadData();
      }
    };
    
    socket.on('company:update', onCompanyUpdate);
    
    return () => {
      socket.off('company:update', onCompanyUpdate);
      socket.disconnect();
    };
  }, [user?.companyId, loadData]);


  const getIndustrialSupervisorForStudent = (studentId: string) => {
    const entry = Object.entries(industrialAssignments).find(([, students]) => students.includes(studentId));
    if (!entry) return null;
    const supId = entry[0];
    return industrialSupervisors.find(s => s.id === supId) || null;
  };

  const handleToggleStudent = (studentId: string) => {
    setSelectedStudentIds(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      }
      return [...prev, studentId];
    });
  };

  const handleAssignToIndustrial = async () => {
    if (!selectedIndustrialSupervisor) {
      toast({ title: 'No Supervisor', description: 'Select an industrial supervisor.', variant: 'destructive' });
      return;
    }

    if (selectedStudentIds.length === 0) {
      toast({ title: 'No Students', description: 'Select at least one student to assign.', variant: 'destructive' });
      return;
    }

    // Categorize students: unassigned vs assigned
    const unassignedStudents: string[] = [];
    const assignedStudents: { id: string; currentSupervisor: User | null }[] = [];
    let commonSupervisor: User | null = null;

    for (const studentId of selectedStudentIds) {
      const supervisor = getIndustrialSupervisorForStudent(studentId);
      if (!supervisor) {
        unassignedStudents.push(studentId);
      } else {
        if (commonSupervisor === null) {
          commonSupervisor = supervisor;
        } else if (commonSupervisor.id !== supervisor.id) {
          // Mixed: students assigned to different supervisors
          toast({
            title: 'Mixed Assignments',
            description: 'Selected students are assigned to different supervisors. Select from one group.',
            variant: 'destructive',
          });
          return;
        }
        assignedStudents.push({ id: studentId, currentSupervisor: supervisor });
      }
    }

    // If selecting new supervisor same as current, reject
    if (assignedStudents.length > 0 && commonSupervisor?.id === selectedIndustrialSupervisor) {
      toast({
        title: 'Same Supervisor',
        description: `Already assigned to ${commonSupervisor.name}. Select a different supervisor.`,
        variant: 'destructive',
      });
      return;
    }

    try {
      setAssigning(true);

      // Case 1: All unassigned -> normal assign
      if (assignedStudents.length === 0) {
        const current = industrialAssignments[selectedIndustrialSupervisor] || [];
        const remaining = 5 - current.length;
        if (remaining < unassignedStudents.length) {
          toast({
            title: 'Capacity Exceeded',
            description: `Supervisor can take ${remaining} more student(s).`,
            variant: 'destructive',
          });
          return;
        }

        await api.assignStudentsToIndustrialSupervisor(selectedIndustrialSupervisor, unassignedStudents);
        await loadData();
        toast({ title: 'Assigned', description: `Assigned ${unassignedStudents.length} student(s) to supervisor.` });
      }
      // Case 2: All assigned to same supervisor -> reassign
      else if (unassignedStudents.length === 0 && commonSupervisor) {
        await api.reassignStudentsToIndustrialSupervisor(
          commonSupervisor.id,
          selectedIndustrialSupervisor,
          assignedStudents.map(s => s.id)
        );
        await loadData();
        toast({
          title: 'Reassigned',
          description: `Reassigned ${assignedStudents.length} student(s) from ${commonSupervisor.name} to new supervisor.`,
        });
      }
      // Case 3: Mixed (some assigned, some not) -> not allowed
      else {
        toast({
          title: 'Mixed Selection',
          description: 'Select only unassigned students for assignment, or only students from one supervisor for reassignment.',
          variant: 'destructive',
        });
        return;
      }

      setSelectedStudentIds([]);
      setSelectedIndustrialSupervisor('');
      setIsAssignToIndustrialOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to assign students';
      toast({
        title: 'Assignment failed',
        description: message.slice(0, 200),
        variant: 'destructive',
      });
    } finally {
      setAssigning(false);
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
          title="Assignments"
          description="Company focal can assign students to industrial supervisors"
        />

        {/* Student Assignments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Student Allocations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading assignments…</span>
              </div>
            ) : (
              <>
            <div className="flex items-center justify-end mb-4 gap-2">
              <Button
                disabled={selectedStudentIds.length === 0}
                onClick={() => setIsAssignToIndustrialOpen(true)}
              >
                Assign to Industrial Supervisor ({selectedStudentIds.length})
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead />
                  <TableHead>Student</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Academic Supervisor</TableHead>
                  <TableHead>Industrial Supervisor</TableHead>
                  <TableHead>Specialization</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allocatedStudents.map((student) => {
                  const ac = student.allocatedCompany;
                  const allocatedCompanyName = typeof ac === 'object' && ac !== null ? (ac as {name?: string}).name : (ac || '');
                  const company = companies.find(c => c.name === allocatedCompanyName);
                  const companySupervisor = company ? getSupervisorForCompany(company.id) : null;
                  const supervisor = student.academicSupervisorName
                    ? { name: student.academicSupervisorName }
                    : companySupervisor;
                  const industrial = getIndustrialSupervisorForStudent(student.id);
                  return (
                    <TableRow key={student.id}>
                      <TableCell>
                        <Checkbox checked={selectedStudentIds.includes(student.id)} onCheckedChange={() => handleToggleStudent(student.id)} />
                      </TableCell>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell className="text-muted-foreground">{company?.name || 'N/A'}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {supervisor?.name || <span className="text-warning">Not Assigned</span>}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {industrial?.name || <span className="text-muted-foreground">No Industrial Supervisor</span>}
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
              </>
            )}
          </CardContent>
        </Card>

        {/* Assign to Industrial Supervisor Dialog */}
        <Dialog open={isAssignToIndustrialOpen} onOpenChange={setIsAssignToIndustrialOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedStudentIds.some(id => getIndustrialSupervisorForStudent(id))
                  ? 'Reassign Students to Industrial Supervisor'
                  : 'Assign Selected Students to Industrial Supervisor'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Selected Students</Label>
                <div className="mt-2">
                  {selectedStudentIds.length > 0 ? (
                    <ul className="list-disc pl-5 text-sm space-y-2">
                      {selectedStudentIds.map(id => {
                        const student = allocatedStudents.find(s => s.id === id);
                        const currentSupervisor = getIndustrialSupervisorForStudent(id);
                        return (
                          <li key={id}>
                            <span>{student?.name || 'Unknown'}</span>
                            {currentSupervisor && (
                              <span className="text-muted-foreground text-xs ml-2">
                                (Currently: {currentSupervisor.name})
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No students selected.</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Industrial Supervisor</Label>
                <Select value={selectedIndustrialSupervisor} onValueChange={setSelectedIndustrialSupervisor}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an industrial supervisor" />
                  </SelectTrigger>
                  <SelectContent>
                    {industrialSupervisors.map((sup) => {
                      const count = (industrialAssignments[sup.id] || []).length;
                      return (
                        <SelectItem key={sup.id} value={sup.id}>
                          {sup.name} ({count}/5)
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAssignToIndustrialOpen(false)} disabled={assigning}>Cancel</Button>
              <Button onClick={handleAssignToIndustrial} disabled={assigning}>
                {assigning ? 'Processing...' : 'Confirm'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Academic Supervisors Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Academic Supervisor
            </CardTitle>
          </CardHeader>
          <CardContent>
            {academicSupervisors.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No academic supervisor assigned to your company yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supervisor</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Assigned Students</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {academicSupervisors.map((supervisor) => {
                    const studentCount = allocatedStudents.filter(s => {
                      const ac = s.allocatedCompany;
                      const allocatedCompanyName = typeof ac === 'object' && ac !== null ? (ac as {name?: string}).name : (ac || '');
                      const company = companies.find(c => c.name === allocatedCompanyName);
                      return company && company.supervisorId === supervisor.id;
                    }).length;
                    return (
                      <TableRow key={supervisor.id}>
                        <TableCell className="font-medium">{supervisor.name}</TableCell>
                        <TableCell className="text-muted-foreground">{supervisor.department}</TableCell>
                        <TableCell className="text-muted-foreground">{supervisor.email}</TableCell>
                        <TableCell className="text-muted-foreground">{studentCount}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Industrial Supervisors Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Industrial Supervisors
            </CardTitle>
          </CardHeader>
          <CardContent>
            {industrialSupervisors.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No industrial supervisors registered for your company yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supervisor</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Assigned Students</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {industrialSupervisors.map((sup) => {
                    const assigned = industrialAssignments[sup.id] || [];
                    return (
                      <TableRow key={sup.id}>
                        <TableCell className="font-medium">
                          <Collapsible>
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" className="p-0">{sup.name}</Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="mt-2">
                                {assigned.length > 0 ? (
                                  <ul className="list-disc pl-5 text-sm">
                                    {assigned.map(sid => (
                                      <li key={sid}>{allocatedStudents.find(s => s.id === sid)?.name || 'Unknown'}</li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-sm text-muted-foreground">No students assigned.</p>
                                )}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{sup.email}</TableCell>
                        <TableCell className="text-muted-foreground">{assigned.length} / 5</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

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
                  <p className="text-sm text-muted-foreground">
                    {typeof viewingStudent.allocatedCompany === 'object' && viewingStudent.allocatedCompany !== null
                      ? ((viewingStudent.allocatedCompany as { name?: string }).name || 'Not allocated')
                      : (viewingStudent.allocatedCompany || 'Not allocated')}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Applications Submitted</Label>
                  <p className="text-sm text-muted-foreground">{viewingStudent.applicationCount} / {viewingStudent.maxApplications}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Department</Label>
                  <p className="text-sm text-muted-foreground">{viewingStudent.department}</p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
