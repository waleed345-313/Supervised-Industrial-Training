import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { GraduationCap, Eye, User, Mail, BookOpen, Building } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useCallback, useEffect, useState } from 'react';
import { Student } from '@/types';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

function getCompanyName(company: unknown): string {
  if (!company) return '—';
  if (typeof company === 'string') return company || '—';
  if (typeof company === 'object' && company !== null && 'name' in company) {
    const value = (company as { name?: unknown }).name;
    return typeof value === 'string' && value.trim().length > 0 ? value : '—';
  }
  return '—';
}

export default function IndustryStudents() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [interns, setInterns] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.companyId) {
      setInterns([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await api.getStudentsForMyCompany();
      setInterns(Array.isArray(data) ? (data as Student[]) : []);
    } catch (err) {
      console.error(err);
      toast({
        title: 'Could not load students',
        description: 'Ensure your account is linked to a registered company.',
        variant: 'destructive',
      });
      setInterns([]);
    } finally {
      setLoading(false);
    }
  }, [toast, user?.companyId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <PageHeader
          title="My Interns"
          description="Students shortlisted or allocated to your registered company only"
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Shortlisted & allocated students
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!user?.companyId ? (
              <p className="text-sm text-muted-foreground">
                Your account is not linked to a registered company. Contact the administrator.
              </p>
            ) : loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : interns.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No shortlisted or allocated students for your company yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Specialization</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {interns.map((student) => {
                    const progress = Math.max(0, Math.min(100, Number(student.progress ?? 0)));
                    const totalMonths = Number(student.totalMonths ?? 4);
                    const monthsCompleted = Math.max(0, Math.min(totalMonths, Number(student.monthsCompleted ?? 0)));
                    const totalWeightage = Number(student.totalWeightage ?? 50);
                    const progressOutOf50 = Math.max(
                      0,
                      Math.min(totalWeightage, Number(student.progressOutOf50 ?? ((progress / 100) * totalWeightage)))
                    );
                    return (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell className="text-muted-foreground">{student.studentId}</TableCell>
                        <TableCell className="text-muted-foreground">{getCompanyName(student.allocatedCompany)}</TableCell>
                        <TableCell className="text-muted-foreground">{student.specialization}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Progress value={progress} className="w-20" />
                              <span className="text-sm text-muted-foreground">{progress.toFixed(0)}%</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {monthsCompleted}/{totalMonths} months | {progressOutOf50.toFixed(2)}/{totalWeightage}
                            </p>
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
                                        <p className="text-sm text-muted-foreground">{selectedStudent.department || '—'}</p>
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
                                        <span className="text-sm">Company: {getCompanyName(selectedStudent.allocatedCompany)}</span>
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
