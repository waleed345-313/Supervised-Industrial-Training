import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useRealtimePanelStudents, useRealtimePanelEvaluations, useRealtimePanelFinalGrades } from '@/hooks/use-realtime-data';
import { ClipboardCheck, Eye, User, GraduationCap, Building, Award } from 'lucide-react';
import { useState } from 'react';
import { Student, Evaluation } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import {
  panelMemberHasMarkedStudent,
  studentsEligibleForPanelFinalGrading,
  type PanelFinalGradeLike,
} from '@/lib/panelGrading';

export default function PanelEvaluations() {
  const { user } = useAuth();
  const { data: students = [], loading, error } = useRealtimePanelStudents();
  const { data: evaluations = [] } = useRealtimePanelEvaluations();
  const { data: finalGrades = [] } = useRealtimePanelFinalGrades();
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | null>(null);

  const eligibleStudents = studentsEligibleForPanelFinalGrading(students);
  const completedStudents = eligibleStudents.filter((s: Student) =>
    panelMemberHasMarkedStudent(s.id, finalGrades as PanelFinalGradeLike[], user?.id)
  );

  const handleViewEvaluation = (student: Student) => {
    const evaluation =
      evaluations.find((e: Evaluation) => e.studentId === student.id && e.type === 'monthly') ||
      evaluations.find((e: Evaluation) => e.studentId === student.id) ||
      null;
    setSelectedStudent(student);
    setSelectedEvaluation(evaluation);
    setViewDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <PageHeader
          title="Student Evaluations"
          description="Students you have already graded appear here. Pending students are on Final Grading."
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Completed Evaluations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Your Internal (/50)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-destructive py-8">
                      Could not load students. Please refresh the page.
                    </TableCell>
                  </TableRow>
                ) : completedStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No completed evaluations yet. Submit final grades from the Final Grading page.
                    </TableCell>
                  </TableRow>
                ) : (
                  completedStudents.map((student: Student) => {
                    const finalGrade = finalGrades.find(
                      (g: PanelFinalGradeLike) => String(g.studentUser) === String(student.id)
                    );
                    const myInternal = finalGrade?.internalEvaluations?.find(
                      (e) => String(e.evaluatorUser) === String(user?.id)
                    )?.internalTotal;

                    return (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell className="text-muted-foreground">{student.allocatedCompany || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="tabular-nums">
                            {typeof myInternal === 'number' ? `${myInternal.toFixed(2)}/50` : '—'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="default">Done</Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" onClick={() => handleViewEvaluation(student)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Student Evaluation Details</DialogTitle>
            <DialogDescription>
              Review the student&apos;s performance and your submitted final grading
            </DialogDescription>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-6">
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

              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Evaluation Results</h4>
                {selectedEvaluation ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h5 className="font-medium">Your internal marks</h5>
                        <p className="text-sm text-muted-foreground">
                          Your submission on the internal evaluation sheet
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary tabular-nums">
                          {(() => {
                            const fg = finalGrades.find(
                              (g: PanelFinalGradeLike) => String(g.studentUser) === String(selectedStudent.id)
                            );
                            const mi = fg?.internalEvaluations?.find(
                              (e) => String(e.evaluatorUser) === String(user?.id)
                            )?.internalTotal;
                            return typeof mi === 'number' ? `${mi.toFixed(2)}/50` : '—';
                          })()}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h5 className="font-medium">Latest monthly remarks</h5>
                      <p className="text-sm text-muted-foreground">
                        {selectedEvaluation.remarks || 'No additional feedback provided.'}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h5 className="font-medium">Evaluation Date</h5>
                      <p className="text-sm text-muted-foreground">{selectedEvaluation.date}</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h5 className="font-medium text-muted-foreground">Monthly evaluation summary unavailable</h5>
                    <p className="text-sm text-muted-foreground">
                      Your final grading is recorded. Open Final Grading to view full rubric breakdown.
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
