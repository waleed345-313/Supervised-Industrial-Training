import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { mockStudents, mockUsers, mockCompanies } from '@/data/mockData';
import { Users, UserPlus, Building2, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Student } from '@/types';

export default function FocalAssignments() {
  const { toast } = useToast();
  const academicSupervisors = mockUsers.filter(u => u.role === 'academic_supervisor');
  const allocatedStudents = mockStudents.filter(s => s.currentStatus === 'allocated');
  
  const [companyAssignments, setCompanyAssignments] = useState<Record<string, string>>({
    'c1': '4', // TechCorp assigned to Dr. Emily Williams
    'c2': '4',
    'c3': '',
    'c4': '',
    'c5': '',
  });
  
  const [isAssignCompanyOpen, setIsAssignCompanyOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [selectedSupervisor, setSelectedSupervisor] = useState<string>('');
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);

  const handleAssignCompany = () => {
    if (!selectedCompany || !selectedSupervisor) {
      toast({
        title: 'Missing Selection',
        description: 'Please select both a company and a supervisor.',
        variant: 'destructive',
      });
      return;
    }
    
    setCompanyAssignments(prev => ({
      ...prev,
      [selectedCompany]: selectedSupervisor,
    }));
    
    const company = mockCompanies.find(c => c.id === selectedCompany);
    const supervisor = academicSupervisors.find(s => s.id === selectedSupervisor);
    
    toast({
      title: 'Company Assigned',
      description: `${company?.name} has been assigned to ${supervisor?.name}.`,
    });
    
    setIsAssignCompanyOpen(false);
    setSelectedCompany('');
    setSelectedSupervisor('');
  };

  const getSupervisorForCompany = (companyId: string) => {
    const supervisorId = companyAssignments[companyId];
    return academicSupervisors.find(s => s.id === supervisorId);
  };

  const getCompaniesForSupervisor = (supervisorId: string) => {
    return mockCompanies.filter(c => companyAssignments[c.id] === supervisorId);
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
            <Button onClick={() => setIsAssignCompanyOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Assign Company
            </Button>
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
                {mockCompanies.map((company) => {
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
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedCompany(company.id);
                            setSelectedSupervisor(companyAssignments[company.id] || '');
                            setIsAssignCompanyOpen(true);
                          }}
                        >
                          {supervisor ? 'Reassign' : 'Assign'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
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
                  const company = mockCompanies.find(c => c.name === student.allocatedCompany);
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
                  const studentCount = allocatedStudents.filter(s => {
                    const company = mockCompanies.find(c => c.name === s.allocatedCompany);
                    return company && companyAssignments[company.id] === supervisor.id;
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
        <Dialog open={isAssignCompanyOpen} onOpenChange={setIsAssignCompanyOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Company to Academic Supervisor</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Company</Label>
                <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a company" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockCompanies.filter(c => c.isActive).map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Academic Supervisor</Label>
                <Select value={selectedSupervisor} onValueChange={setSelectedSupervisor}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a supervisor" />
                  </SelectTrigger>
                  <SelectContent>
                    {academicSupervisors.map((supervisor) => (
                      <SelectItem key={supervisor.id} value={supervisor.id}>
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
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
