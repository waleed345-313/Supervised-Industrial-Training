import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { mockStudents } from '@/data/mockData';
import { GraduationCap, ClipboardCheck, Eye, User, Mail, BookOpen, Building } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';

export default function IndustryStudents() {
  const { user } = useAuth();
  const [selectedStudent, setSelectedStudent] = useState<typeof mockStudents[0] | null>(null);
  const assignedInterns = mockStudents.filter(s => s.currentStatus === 'allocated');

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <PageHeader
          title="My Interns"
          description="View and manage assigned interns"
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Assigned Interns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Specialization</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignedInterns.map((student) => {
                  const progress = Math.floor(Math.random() * 40) + 60;
                  return (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell className="text-muted-foreground">{student.studentId}</TableCell>
                      <TableCell className="text-muted-foreground">{student.specialization}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={progress} className="w-20" />
                          <span className="text-sm text-muted-foreground">{progress}%</span>
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
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
