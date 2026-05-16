import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useRealtimeSupervisorStudents } from '@/hooks/use-realtime-data';
import { GraduationCap, Eye, Mail, User, BookOpen, Building, RefreshCw } from 'lucide-react';
import { useState } from 'react';

interface Student {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  studentId: string;
  cgpa: number;
  specialization: string;
  applicationCount: number;
  maxApplications: number;
  currentStatus: string;
  allocatedCompany?: string;
  allocatedCompanyId?: string;
  progress?: number;
  totalScore?: number;
  monthsCompleted?: number;
  totalMonths?: number;
  totalWeightage?: number;
}

export default function SupervisorStudents() {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const { data: students = [], loading, refresh } = useRealtimeSupervisorStudents();

  const handleRefresh = () => {
    refresh();
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <PageHeader
          title="My Students"
          description="View students assigned to you directly or through company assignments"
          action={
            <Button variant="outline" onClick={handleRefresh} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          }
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Assigned Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50 animate-pulse" />
                <p>Loading students...</p>
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No students assigned yet.</p>
                <p className="text-sm mt-2">
                  Students will appear here when:
                </p>
                <ul className="text-sm list-disc list-inside mt-1">
                  <li>You are assigned as their academic supervisor</li>
                  <li>A company is assigned to you and students are allocated to that company</li>
                </ul>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => {
                    const progress = student.progress || 0;
                    const totalScore = student.totalScore || 0;
                    const monthsCompleted = student.monthsCompleted || 0;
                    const totalMonths = student.totalMonths || 4;
                    const totalWeightage = student.totalWeightage || 50;
                    return (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell className="text-muted-foreground">{student.studentId}</TableCell>
                        <TableCell className="text-muted-foreground">{student.allocatedCompany || 'N/A'}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <Progress value={progress} className="w-20" />
                              <span className="text-sm font-medium">{progress}%</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {monthsCompleted}/{totalMonths} months | {totalScore.toFixed(2)}/{totalWeightage}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" onClick={() => setSelectedStudent(student)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                  <User className="h-5 w-5" />
                                  Student Details
                                </DialogTitle>
                              </DialogHeader>
                              {selectedStudent && (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2">
                                        <User className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">{selectedStudent.name}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Mail className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm text-muted-foreground">{selectedStudent.email}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm">ID: {selectedStudent.studentId}</span>
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <div>
                                        <span className="text-sm font-medium">CGPA:</span>
                                        <p className="text-sm text-muted-foreground">{selectedStudent.cgpa}/4.0</p>
                                      </div>
                                      <div>
                                        <span className="text-sm font-medium">Specialization:</span>
                                        <p className="text-sm text-muted-foreground">{selectedStudent.specialization}</p>
                                      </div>
                                      <div>
                                        <span className="text-sm font-medium">Department:</span>
                                        <p className="text-sm text-muted-foreground">{selectedStudent.department}</p>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm font-medium">Status:</span>
                                      <Badge variant={selectedStudent.currentStatus === 'allocated' ? 'default' : 'secondary'}>
                                        {selectedStudent.currentStatus}
                                      </Badge>
                                    </div>
                                    {selectedStudent.allocatedCompany && (
                                      <div className="flex items-center gap-2">
                                        <Building className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm">Company: {selectedStudent.allocatedCompany}</span>
                                      </div>
                                    )}
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm font-medium">Applications:</span>
                                      <span className="text-sm text-muted-foreground">
                                        {selectedStudent.applicationCount}/{selectedStudent.maxApplications}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
