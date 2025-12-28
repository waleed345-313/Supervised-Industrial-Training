import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { mockStudents, mockEvaluations, mockProgressReports } from '@/data/mockData';
import { FileText, ClipboardCheck, Calendar, Award, Eye, User, GraduationCap, Building } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Student, Evaluation } from '@/types';

export function EvaluationPanelDashboard() {
  const allocatedStudents = mockStudents.filter(s => s.currentStatus === 'allocated');
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | null>(null);
  const { toast } = useToast();

  const handleViewEvaluation = (student: Student) => {
    const evaluation = mockEvaluations.find(e => e.studentId === student.id);
    setSelectedStudent(student);
    setSelectedEvaluation(evaluation || null);
    setViewDialogOpen(true);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Evaluation Panel Dashboard"
        description="Review student performance and final grading"
      />

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Students to Evaluate"
          value={allocatedStudents.length}
          description="This cycle"
          icon={<ClipboardCheck className="h-5 w-5" />}
        />
        <StatCard
          title="Reports Received"
          value={mockProgressReports.length}
          description="From supervisors"
          icon={<FileText className="h-5 w-5" />}
        />
        <StatCard
          title="Evaluations Done"
          value={mockEvaluations.length}
          description="Completed"
          icon={<Award className="h-5 w-5" />}
        />
        <StatCard
          title="Pending"
          value={allocatedStudents.length - mockEvaluations.length}
          description="Awaiting grading"
          icon={<Calendar className="h-5 w-5" />}
        />
      </div>

      {/* Students Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Student Evaluations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead className="text-center">Industrial Score</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allocatedStudents.map((student) => {
                const evaluation = mockEvaluations.find(e => e.studentId === student.id);
                const progress = evaluation ? (evaluation.score / evaluation.maxScore) * 100 : 0;
                
                return (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell className="text-muted-foreground">{student.allocatedCompany}</TableCell>
                    <TableCell className="w-32">
                      <div className="flex items-center gap-2">
                        <Progress value={progress} className="h-2 flex-1" />
                        <span className="text-sm text-muted-foreground min-w-[35px] text-right">{Math.round(progress)}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-center font-medium">
                      {evaluation ? `${evaluation.score}/${evaluation.maxScore}` : 'Pending'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button variant="outline" size="sm" onClick={() => handleViewEvaluation(student)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Progress Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Submitted Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Month</TableHead>
                <TableHead>Industrial Remarks</TableHead>
                <TableHead>Academic Remarks</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockProgressReports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium">{report.studentName}</TableCell>
                  <TableCell className="text-muted-foreground">{report.month}</TableCell>
                  <TableCell className="text-muted-foreground max-w-xs truncate">
                    {report.industrialRemarks || 'Pending'}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-xs truncate">
                    {report.academicRemarks || 'Pending'}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={report.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Evaluation Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Student Evaluation Details</DialogTitle>
            <DialogDescription>
              Review the student's performance and evaluation scores
            </DialogDescription>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-6">
              {/* Student Information */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Student Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{selectedStudent.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">CGPA: {selectedStudent.cgpa}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Company: {selectedStudent.allocatedCompany}</span>
                </div>
              </div>

              {/* Evaluation Results */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Evaluation Results</h4>
                {selectedEvaluation ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h5 className="font-medium">Industrial Performance Score</h5>
                        <p className="text-sm text-muted-foreground">Based on supervisor feedback and progress reports</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">
                          {selectedEvaluation.score}/{selectedEvaluation.maxScore}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {Math.round((selectedEvaluation.score / selectedEvaluation.maxScore) * 100)}%
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h5 className="font-medium">Detailed Feedback</h5>
                      <p className="text-sm text-muted-foreground">
                        {selectedEvaluation.feedback || 'No additional feedback provided.'}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h5 className="font-medium">Evaluation Date</h5>
                      <p className="text-sm text-muted-foreground">
                        {selectedEvaluation.evaluatedDate}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h5 className="font-medium text-muted-foreground">Evaluation Pending</h5>
                    <p className="text-sm text-muted-foreground">
                      This student has not been evaluated yet. Progress reports are still being collected.
                    </p>
                  </div>
                )}
              </div>

              {/* Progress Reports Summary */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Progress Reports</h4>
                <div className="text-sm text-muted-foreground">
                  {mockProgressReports.filter(r => r.studentId === selectedStudent.id).length} reports submitted
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
