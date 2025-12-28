import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { mockStudents, mockCompanies, mockEvaluations } from '@/data/mockData';
import { ClipboardCheck, Eye, User, GraduationCap, Building, Award } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Student, Evaluation } from '@/types';

export default function PanelEvaluations() {
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
    <DashboardLayout>
      <div className="space-y-8">
        <PageHeader
          title="Student Evaluations"
          description="Evaluate student performance"
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Students to Evaluate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Industrial Score</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allocatedStudents.map((student) => {
                  const company = mockCompanies.find(c => c.name === student.allocatedCompany);
                  const evaluation = mockEvaluations.find(e => e.studentId === student.id);
                  const progress = Math.floor(Math.random() * 40) + 60;
                  return (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell className="text-muted-foreground">{company?.name || 'N/A'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={progress} className="w-20" />
                          <span className="text-sm text-muted-foreground">{progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {evaluation ? `${evaluation.score}/${evaluation.maxScore}` : 'Pending'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleViewEvaluation(student)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

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
                        {selectedEvaluation.remarks || 'No additional feedback provided.'}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h5 className="font-medium">Evaluation Date</h5>
                      <p className="text-sm text-muted-foreground">
                        {selectedEvaluation.date}
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
