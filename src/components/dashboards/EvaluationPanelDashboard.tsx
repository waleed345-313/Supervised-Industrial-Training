import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useRealtimePanelStudents, useRealtimePanelEvaluations, useRealtimePanelProgressReports } from '@/hooks/use-realtime-data';
import { FileText, ClipboardCheck, Calendar, Award, Eye, User, GraduationCap, Building } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useState } from 'react';
import { Student, Evaluation, IndustrialMonthlyEvaluationRow } from '@/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

function combinedProgressPercent(student: Student): number {
  const ext = Number(student.industrialExternalTotal ?? 0);
  const int = Number(student.internalTotalFromGrade ?? 0);
  if (typeof student.progressOutOf100 === 'number' && Number.isFinite(student.progressOutOf100)) {
    return Math.min(100, Math.round(student.progressOutOf100));
  }
  return Math.min(100, Math.round(ext + int));
}

function fourIndustrialMonthSlots(student: Student): (IndustrialMonthlyEvaluationRow | null)[] {
  const rows = student.industrialMonthlyEvaluations ?? [];
  const slots: (IndustrialMonthlyEvaluationRow | null)[] = [null, null, null, null];
  for (let i = 0; i < Math.min(4, rows.length); i += 1) slots[i] = rows[i];
  return slots;
}

const INDUSTRIAL_MONTH_CAP = 12.5;

/** Industrial month contribution toward the external /50 total (12.5 per month). */
function formatIndustrialMonthOutOf125(slot: IndustrialMonthlyEvaluationRow): string {
  let w: number;
  if (typeof slot.weightedOutOf125 === 'number' && Number.isFinite(slot.weightedOutOf125)) {
    w = slot.weightedOutOf125;
  } else {
    const max = slot.maxScore || 0;
    w = max > 0 ? (slot.score / max) * INDUSTRIAL_MONTH_CAP : 0;
  }
  return `${Number(w.toFixed(2))}/12.5`;
}

export function EvaluationPanelDashboard() {
  const { data: students = [], loading: studentsLoading } = useRealtimePanelStudents();
  const { data: evaluations = [], loading: evalsLoading } = useRealtimePanelEvaluations();
  const { data: reports = [], loading: reportsLoading } = useRealtimePanelProgressReports();

  const loading = studentsLoading || evalsLoading || reportsLoading;
  const allocatedStudents = students.filter((s: Student) => s.currentStatus === 'allocated');

  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | null>(null);

  const handleViewEvaluation = (student: Student) => {
    const evaluation =
      evaluations.find((e: Evaluation) => e.studentId === student.id && e.type === 'monthly') ||
      evaluations.find((e: Evaluation) => e.studentId === student.id) ||
      null;
    setSelectedStudent(student);
    setSelectedEvaluation(evaluation);
    setViewDialogOpen(true);
  };

  const tableColSpan = 8;

  return (
    <TooltipProvider>
    <div className="space-y-8">
      <PageHeader
        title="Evaluation Panel Dashboard"
        description="Review student performance and final grading"
      />

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Students to Evaluate"
          value={loading ? 0 : allocatedStudents.length}
          description="This cycle"
          icon={<ClipboardCheck className="h-5 w-5" />}
        />
        <StatCard
          title="Reports Received"
          value={loading ? 0 : reports.length}
          description="From supervisors"
          icon={<FileText className="h-5 w-5" />}
        />
        <StatCard
          title="Evaluations Done"
          value={loading ? 0 : evaluations.length}
          description="Completed"
          icon={<Award className="h-5 w-5" />}
        />
        <StatCard
          title="Pending"
          value={loading ? 0 : Math.max(0, allocatedStudents.length - evaluations.length)}
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
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[120px]">Student</TableHead>
                <TableHead className="min-w-[120px]">Company</TableHead>
                <TableHead className="min-w-[140px]">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help border-b border-dotted border-muted-foreground">
                        Progress / 100
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      Combined total out of 100: industrial supervisor monthly evaluations (50) plus
                      internal evaluation from the final grade sheet (50).
                    </TooltipContent>
                  </Tooltip>
                </TableHead>
                <TableHead className="text-center min-w-[92px]" title="Industrial weight toward external /50 (max 12.5 per month)">
                  Month 1
                </TableHead>
                <TableHead className="text-center min-w-[92px]" title="Industrial weight toward external /50 (max 12.5 per month)">
                  Month 2
                </TableHead>
                <TableHead className="text-center min-w-[92px]" title="Industrial weight toward external /50 (max 12.5 per month)">
                  Month 3
                </TableHead>
                <TableHead className="text-center min-w-[92px]" title="Industrial weight toward external /50 (max 12.5 per month)">
                  Month 4
                </TableHead>
                <TableHead className="text-center min-w-[72px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading || allocatedStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={tableColSpan} className="text-center text-muted-foreground py-8">
                    No data found yet.
                  </TableCell>
                </TableRow>
              ) : (
                allocatedStudents.map((student: Student) => {
                  const progress = combinedProgressPercent(student);
                  const slots = fourIndustrialMonthSlots(student);

                  return (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell className="text-muted-foreground">{student.allocatedCompany || 'N/A'}</TableCell>
                      <TableCell className="w-[150px]">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <Progress value={progress} className="h-2 flex-1" />
                            <span className="text-sm text-muted-foreground min-w-[40px] text-right tabular-nums">
                              {progress}%
                            </span>
                          </div>
                          <span className="text-[11px] text-muted-foreground tabular-nums">
                            ext {Number(student.industrialExternalTotal ?? 0).toFixed(1)}/50 · int{' '}
                            {Number(student.internalTotalFromGrade ?? 0).toFixed(1)}/50
                          </span>
                        </div>
                      </TableCell>
                      {slots.map((slot, idx) => (
                        <TableCell key={`${student.id}-m-${idx}`} className="text-center align-top text-xs p-2">
                          {slot ? (
                            <div className="space-y-0.5">
                              <div className="font-medium tabular-nums">
                                {formatIndustrialMonthOutOf125(slot)}
                              </div>
                              <div className="text-[11px] text-muted-foreground leading-tight line-clamp-2" title={slot.evaluatorName}>
                                {slot.evaluatorName || '—'}
                              </div>
                              <div className="text-[10px] text-muted-foreground truncate" title={slot.month}>
                                {slot.month}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      ))}
                      <TableCell className="text-center">
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
              {loading || reports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No data found yet.
                  </TableCell>
                </TableRow>
              ) : (
                reports.map((report: any) => (
                  <TableRow key={report._id || report.id}>
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
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Evaluation Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Student Evaluation Details</DialogTitle>
            <DialogDescription>
              Industrial supervisor monthly marks and combined progress (internal + external out of 100).
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

              {/* Combined progress */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Progress out of 100</h4>
                <div className="flex items-center justify-between p-4 border rounded-lg gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      External (industrial months, weighted to 50) + internal (final grade sheet, 50).
                    </p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      External {Number(selectedStudent.industrialExternalTotal ?? 0).toFixed(2)}/50 · Internal{' '}
                      {Number(selectedStudent.internalTotalFromGrade ?? 0).toFixed(2)}/50
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-2xl font-bold text-primary tabular-nums">
                      {combinedProgressPercent(selectedStudent)}/100
                    </div>
                  </div>
                </div>
              </div>

              {/* Monthly industrial */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Industrial supervisor (4 months)
                </h4>
                {(selectedStudent.industrialMonthlyEvaluations?.length ?? 0) > 0 ? (
                  <ul className="space-y-2 border rounded-lg divide-y">
                    {fourIndustrialMonthSlots(selectedStudent)
                      .filter((s): s is IndustrialMonthlyEvaluationRow => s != null)
                      .map((slot) => (
                        <li
                          key={slot.monthKey || slot.month}
                          className="p-3 flex flex-wrap items-baseline justify-between gap-2"
                        >
                          <div>
                            <span className="text-sm font-medium">{slot.month}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              by {slot.evaluatorName || 'Supervisor'}
                            </span>
                          </div>
                          <span className="text-sm tabular-nums font-medium">
                            {formatIndustrialMonthOutOf125(slot)}
                          </span>
                        </li>
                      ))}
                  </ul>
                ) : (
                  <div className="text-center py-6 border rounded-lg bg-muted/30">
                    <Award className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No industrial monthly evaluations recorded yet.</p>
                  </div>
                )}
                {selectedEvaluation?.remarks ? (
                  <div className="space-y-1">
                    <h5 className="text-sm font-medium">Latest monthly remarks</h5>
                    <p className="text-sm text-muted-foreground">{selectedEvaluation.remarks}</p>
                  </div>
                ) : null}
              </div>

              {/* Progress Reports Summary */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Progress Reports</h4>
                <div className="text-sm text-muted-foreground">
                  {reports.filter((r: any) => String(r.studentUser) === selectedStudent.id).length} reports submitted
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </TooltipProvider>
  );
}
