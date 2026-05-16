import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useRealtimeSupervisorStudents, useRealtimeProgressReports, useRealtimeFeedback, useRealtimeData } from '@/hooks/use-realtime-data';
import { GraduationCap, FileText, MessageSquare, Clock, User, RefreshCw, Eye } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useNavigate } from 'react-router-dom';
import { useCallback, useState } from 'react';
import { getSupervisorMonthlyEvaluations } from '@/lib/api';

interface Student {
  id: string;
  name: string;
  email: string;
  studentId: string;
  allocatedCompany?: string;
  specialization?: string;
  cgpa?: number;
  currentStatus?: string;
}

interface ProgressReport {
  _id: string;
  studentUser: string;
  studentName: string;
  month: string;
  submittedDate: string;
  status: 'pending' | 'reviewed' | 'approved';
  summary: string;
  industrialRemarks?: string;
  academicRemarks?: string;
}

interface MonthlyEvaluation {
  id: string;
  studentId: string;
  studentName: string;
  month: string;
  marksOutOf12_5: number;
  date: string;
}

function getMonthOrder(month: string): number {
  const normalized = String(month || '').trim().toLowerCase();
  const match = normalized.match(/(\d+)/);
  if (match) return Number(match[1]);
  return -1;
}

export function AcademicSupervisorDashboard() {
  const navigate = useNavigate();
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isProgressDialogOpen, setIsProgressDialogOpen] = useState(false);
  
  const loadMonthlyEvaluations = useCallback(async () => getSupervisorMonthlyEvaluations(), []);
  const { data: students = [], loading: studentsLoading, refresh: refreshStudents } = useRealtimeSupervisorStudents();
  const { data: progressReports = [], loading: reportsLoading } = useRealtimeProgressReports();
  const { data: feedback = [], loading: feedbackLoading } = useRealtimeFeedback();
  const { data: monthlyEvaluations = [], loading: monthlyEvalsLoading } = useRealtimeData({
    fetchFn: loadMonthlyEvaluations,
    socketEvent: 'supervisor:update',
    updateTypes: ['evaluations'],
    initialData: [],
    pollingInterval: 30000,
  });

  const handleViewProgress = (student: Student) => {
    setSelectedStudent(student);
    setIsProgressDialogOpen(true);
  };

  const handleReviewReport = (reportId: string) => {
    navigate('/supervisor/progress');
  };

  const getStudentProgressReports = (studentId: string) => {
    return progressReports.filter((r: ProgressReport) => r.studentUser === studentId);
  };

  const assignedStudents = students;
  const pendingReviews = progressReports.filter((r: ProgressReport) => r.status === 'pending').length;
  const latestMonthNumber = (monthlyEvaluations as MonthlyEvaluation[]).reduce((latest: number, report: MonthlyEvaluation) => {
    const order = getMonthOrder(report.month);
    return order > latest ? order : latest;
  }, -1);
  const latestMonthEvaluations = latestMonthNumber >= 0
    ? (monthlyEvaluations as MonthlyEvaluation[]).filter((r: MonthlyEvaluation) => getMonthOrder(r.month) === latestMonthNumber)
    : [];
  const latestMonthLabel = latestMonthEvaluations[0]?.month || '';

  const handleRefresh = () => {
    refreshStudents();
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Academic Supervisor Dashboard"
        description="Monitor students assigned to you directly or through company assignments"
        action={
          <Button variant="outline" onClick={handleRefresh} disabled={studentsLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${studentsLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        }
      />

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Assigned Students"
          value={studentsLoading ? 0 : assignedStudents.length}
          description="Currently supervised"
          icon={<GraduationCap className="h-5 w-5" />}
        />
        <StatCard
          title="Progress Reports"
          value={reportsLoading ? 0 : progressReports.length}
          description="Total submissions"
          icon={<FileText className="h-5 w-5" />}
        />
        <StatCard
          title="Pending Reviews"
          value={reportsLoading ? 0 : pendingReviews}
          description="Awaiting feedback"
          icon={<Clock className="h-5 w-5" />}
        />
        <StatCard
          title="Feedback Sent"
          value={feedbackLoading ? 0 : feedback.length}
          description="Total messages"
          icon={<MessageSquare className="h-5 w-5" />}
        />
      </div>

      {/* View Progress Dialog */}
      <Dialog open={isProgressDialogOpen} onOpenChange={setIsProgressDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Student Progress: {selectedStudent?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <span className="text-sm font-medium">Student ID:</span>
                  <p className="text-sm text-muted-foreground">{selectedStudent.studentId}</p>
                </div>
                <div>
                  <span className="text-sm font-medium">Company:</span>
                  <p className="text-sm text-muted-foreground">{selectedStudent.allocatedCompany || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium">Specialization:</span>
                  <p className="text-sm text-muted-foreground">{selectedStudent.specialization || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium">CGPA:</span>
                  <p className="text-sm text-muted-foreground">{selectedStudent.cgpa || 'N/A'}</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-3">Progress Reports History</h4>
                {getStudentProgressReports(selectedStudent.id).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No progress reports submitted yet.</p>
                ) : (
                  <div className="space-y-2">
                    {getStudentProgressReports(selectedStudent.id).map((report: ProgressReport) => (
                      <div key={report._id} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{report.month}</span>
                          <StatusBadge status={report.status} />
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Submitted: {new Date(report.submittedDate).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button 
                  className="flex-1" 
                  onClick={() => {
                    setIsProgressDialogOpen(false);
                    navigate('/supervisor/progress');
                  }}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Go to Progress Reports
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    setIsProgressDialogOpen(false);
                    navigate('/supervisor/feedback');
                  }}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Send Feedback
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Assigned Students */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            My Students
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Student ID</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Specialization</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {studentsLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>no students assigned yet.</p>
                  </TableCell>
                </TableRow>
              ) : assignedStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>no students assigned yet.</p>
                  </TableCell>
                </TableRow>
              ) : (
                assignedStudents.map((student: Student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell className="text-muted-foreground">{student.studentId}</TableCell>
                    <TableCell className="text-muted-foreground">{student.allocatedCompany || 'N/A'}</TableCell>
                    <TableCell className="text-muted-foreground">{student.specialization || 'N/A'}</TableCell>
                    <TableCell>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleViewProgress(student)}
                      >
                        View Progress
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Latest Monthly Evaluations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
              {latestMonthLabel || 'Latest Month'} Evaluations
            </span>
            {latestMonthEvaluations.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                {latestMonthEvaluations.length} report(s)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Marks</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {latestMonthEvaluations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No progress uploaded yet.</p>
                  </TableCell>
                </TableRow>
              ) : (
                latestMonthEvaluations.map((report: MonthlyEvaluation) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">{report.studentName}</TableCell>
                    <TableCell className="text-muted-foreground">{report.date}</TableCell>
                    <TableCell className="text-muted-foreground">{report.marksOutOf12_5.toFixed(2)}/12.5</TableCell>
                    <TableCell>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate('/supervisor/feedback')}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
