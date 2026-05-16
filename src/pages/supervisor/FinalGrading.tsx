import { useState } from "react";
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useRealtimeSupervisorFinalGradingStudents } from '@/hooks/use-realtime-data';
import { useRealtimeFinalGrades } from '@/hooks/use-realtime-data';
import { submitFinalGrade, exportFinalGrades } from '@/lib/api';
import { Award, Download, Eye, Pencil } from 'lucide-react';
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import type { Student } from "@/types";
import { industrialExternalFromStudent } from "@/lib/utils";

interface InternalEvalContribution {
  evaluatorUser: string;
  evaluatorName: string;
  evaluatorRole: string;
  content: number;
  visuals: number;
  presentationSkills: number;
  organization: number;
  handlingOfQuestions: number;
  reportScore: number;
  internalTotal: number;
  remarks?: string;
}

interface FinalGrade {
  _id: string;
  studentUser: string;
  studentName: string;
  externalTotal: number;
  content: number;
  visuals: number;
  presentationSkills: number;
  organization: number;
  handlingOfQuestions: number;
  reportScore: number;
  presentationAvg: number;
  internalTotal: number;
  grandTotal: number;
  grade: string;
  remarks?: string;
  internalEvaluations?: InternalEvalContribution[];
  contributorCount?: number;
}

// Internal Evaluation schema based on the SIT-2 Internal Evaluation Sheet
const gradeSchema = z.object({
  // Presentation Rubrics (each out of 10, totaled differently)
  content: z.number().min(0).max(10),
  visuals: z.number().min(0).max(10),
  presentationSkills: z.number().min(0).max(10),
  organization: z.number().min(0).max(10),
  handlingOfQuestions: z.number().min(0).max(30),
  reportScore: z.number().min(0).max(10),
  externalTotal: z.number().min(0).max(50),
  remarks: z.string().max(500, "Remarks must be less than 500 characters").optional(),
});

type GradeFormData = z.infer<typeof gradeSchema>;

export default function SupervisorFinalGrading() {
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [viewingGrade, setViewingGrade] = useState<FinalGrade | null>(null);
  const { toast } = useToast();

  const { data: students = [], loading: studentsLoading } = useRealtimeSupervisorFinalGradingStudents();
  const { data: grades = [], loading: gradesLoading, refresh } = useRealtimeFinalGrades();

  const finalGradingStudents = students as Student[];

  const form = useForm<GradeFormData>({
    resolver: zodResolver(gradeSchema),
    defaultValues: {
      content: 7,
      visuals: 7,
      presentationSkills: 7,
      organization: 7,
      handlingOfQuestions: 20,
      reportScore: 7,
      externalTotal: 0,
      remarks: "",
    },
  });

  const handleGrade = (student: Student) => {
    setSelectedStudent(student);
    const existingGrade = grades.find(
      (g) => String(g.studentUser) === String(student.id)
    ) as FinalGrade | undefined;

    const my =
      existingGrade?.internalEvaluations?.find((e) => String(e.evaluatorUser) === String(user?.id)) ||
      ((!existingGrade?.internalEvaluations || existingGrade.internalEvaluations.length === 0) && existingGrade
        ? existingGrade
        : undefined);

    const ext =
      industrialExternalFromStudent(student) ||
      (existingGrade?.externalTotal ?? 0);

    form.reset({
      content: my?.content ?? 7,
      visuals: my?.visuals ?? 7,
      presentationSkills: my?.presentationSkills ?? 7,
      organization: my?.organization ?? 7,
      handlingOfQuestions: my?.handlingOfQuestions ?? 20,
      reportScore: my?.reportScore ?? 7,
      externalTotal: ext,
      remarks: my?.remarks ?? "",
    });
    setIsDialogOpen(true);
  };

  const handleView = (student: Student) => {
    const grade = grades.find((g) => String(g.studentUser) === String(student.id)) as FinalGrade | undefined;
    if (grade) {
      setViewingGrade(grade);
      setIsViewDialogOpen(true);
    } else {
      toast({
        title: "No Grade",
        description: "This student has not been graded yet.",
        variant: "destructive",
      });
    }
  };

  const handleExport = async () => {
    try {
      const blob = await exportFinalGrades();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `final-grades-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({
        title: "Export Complete",
        description: "Final grades have been exported to CSV.",
      });
    } catch (err) {
      toast({
        title: "Export Failed",
        description: "Failed to export grades. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Calculate presentation average and internal total
  const calculateTotals = (data: GradeFormData) => {
    const presentationAvg = (data.content + data.visuals + data.presentationSkills + data.organization) / 4;
    const internalTotal = presentationAvg + data.handlingOfQuestions + data.reportScore;
    const grandTotal = data.externalTotal + internalTotal;
    return { presentationAvg, internalTotal, grandTotal };
  };

  // Get grade letter based on total
  const getGradeLetter = (total: number) => {
    if (total >= 85) return 'A+';
    if (total >= 80) return 'A';
    if (total >= 75) return 'B+';
    if (total >= 70) return 'B';
    if (total >= 65) return 'C+';
    if (total >= 60) return 'C';
    if (total >= 55) return 'D+';
    if (total >= 50) return 'D';
    return 'F';
  };

  const onSubmit = async (data: GradeFormData) => {
    if (!selectedStudent) return;

    try {
      await submitFinalGrade({
        studentId: selectedStudent.id,
        content: data.content,
        visuals: data.visuals,
        presentationSkills: data.presentationSkills,
        organization: data.organization,
        handlingOfQuestions: data.handlingOfQuestions,
        reportScore: data.reportScore,
        remarks: data.remarks,
      });

      toast({
        title: "Grade Submitted",
        description: `Internal marks saved for ${selectedStudent?.name}. External /50 follows industrial evaluations; combined internal is averaged across all evaluators.`,
      });

      refresh();
      setIsDialogOpen(false);
      setSelectedStudent(null);
      form.reset();
    } catch (err) {
      toast({
        title: "Submission Failed",
        description: "Failed to submit grade. Please try again.",
        variant: "destructive",
      });
    }
  };

  const ScoreInput = ({ name, label, max, description, disabled }: { name: keyof GradeFormData; label: string; max: number; description?: string; disabled?: boolean }) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <div className="flex justify-between items-center">
            <div>
              <FormLabel>{label}</FormLabel>
              {description && <p className="text-xs text-muted-foreground">{description}</p>}
            </div>
            <span className="text-sm font-medium">{field.value as number}/{max}</span>
          </div>
          <FormControl>
            <Slider
              value={[field.value as number]}
              onValueChange={(value) => field.onChange(value[0])}
              min={0}
              max={max}
              step={0.5}
              className="py-2"
              disabled={disabled}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  // Watch form values for live calculation — internal column is the average across all evaluator marks (/50 each)
  const watchedValues = form.watch();
  const draftSingleInternal = calculateTotals(watchedValues as GradeFormData).internalTotal;
  const existingRow = grades.find(
    (g) => selectedStudent && String(g.studentUser) === String(selectedStudent.id)
  ) as FinalGrade | undefined;
  const otherContributions =
    existingRow?.internalEvaluations?.filter((e) => String(e.evaluatorUser) !== String(user?.id)) ?? [];
  const evaluatorCount = Math.max(1, otherContributions.length + 1);
  const internalTotal =
    otherContributions.reduce((sum, e) => sum + Number(e.internalTotal), 0) + draftSingleInternal;
  const averagedInternalTotal = internalTotal / evaluatorCount;

  const extShown = watchedValues.externalTotal ?? 0;
  const grandTotal = extShown + averagedInternalTotal;
  const currentGrade = getGradeLetter(grandTotal);

  const presentationAvgDisplay =
    (((watchedValues as GradeFormData).content ?? 0) +
      ((watchedValues as GradeFormData).visuals ?? 0) +
      ((watchedValues as GradeFormData).presentationSkills ?? 0) +
      ((watchedValues as GradeFormData).organization ?? 0)) /
    4;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <PageHeader
          title="Final Grades - Internal Evaluation"
          description="Lists students only after industrial 4‑month marking (50 marks). Panel members and supervisors each grade out of 50 internally; totals use the average so the internal component stays /50."
          action={
            <Button onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export Grades
            </Button>
          }
        />

        {/* View Grade Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                View Grade: {viewingGrade?.studentName}
              </DialogTitle>
            </DialogHeader>
            {viewingGrade && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <span className="text-sm font-medium">External Score:</span>
                    <p className="text-sm text-muted-foreground">{viewingGrade.externalTotal}/50</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Internal Total:</span>
                    <p className="text-sm text-muted-foreground">{viewingGrade.internalTotal.toFixed(2)}/50</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Grand Total:</span>
                    <p className="text-xl font-bold">{viewingGrade.grandTotal.toFixed(1)}/100</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Grade:</span>
                    <Badge className="ml-2" variant={viewingGrade.grandTotal >= 60 ? 'default' : 'destructive'}>
                      {viewingGrade.grade}
                    </Badge>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <h4 className="font-semibold text-foreground">Averaged internal rubrics (after combining evaluators)</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span>Content:</span><span className="text-right">{viewingGrade.content.toFixed(2)}/10</span>
                    <span>Visuals:</span><span className="text-right">{viewingGrade.visuals.toFixed(2)}/10</span>
                    <span>Presentation Skills:</span><span className="text-right">{viewingGrade.presentationSkills.toFixed(2)}/10</span>
                    <span>Organization:</span><span className="text-right">{viewingGrade.organization.toFixed(2)}/10</span>
                    <span>Handling of Questions:</span><span className="text-right">{viewingGrade.handlingOfQuestions.toFixed(2)}/30</span>
                    <span>Report Score:</span><span className="text-right">{viewingGrade.reportScore.toFixed(2)}/10</span>
                  </div>
                </div>

                {!!viewingGrade.internalEvaluations?.length && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h4 className="font-semibold text-foreground">Per-evaluator internal (/50 each)</h4>
                      <ul className="space-y-2 text-sm">
                        {viewingGrade.internalEvaluations!.map((row, i) => (
                          <li key={`${row.evaluatorUser}-${i}`} className="flex justify-between gap-2 border-b border-border/60 pb-2">
                            <span className="text-muted-foreground">
                              {row.evaluatorName}
                              <span className="ml-2 text-xs uppercase">({row.evaluatorRole.replace('_', ' ')})</span>
                            </span>
                            <span className="font-medium tabular-nums">{Number(row.internalTotal).toFixed(2)}/50</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}

                {viewingGrade.remarks && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Latest remarks (record)</h4>
                      <p className="text-sm text-muted-foreground">{viewingGrade.remarks}</p>
                    </div>
                  </>
                )}

                <div className="flex justify-end">
                  <Button onClick={() => setIsViewDialogOpen(false)}>Close</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Grade Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Grade Student: {selectedStudent?.name}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* External Evaluation Section */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-foreground">External Evaluation (Industrial Supervisor)</h4>
                  <ScoreInput
                    name="externalTotal"
                    label="Total External Score"
                    max={50}
                    description="Sum of 4 monthly evaluations from Industrial Supervisor"
                    disabled={true}
                  />
                </div>

                <Separator />

                {/* Presentation Rubrics Section */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-foreground">Presentation Rubrics (Internal)</h4>
                  <p className="text-xs text-muted-foreground">
                    Each evaluator completes this sheet out of 50 internally. Stored totals use the average across all submissions (e.g. 3 panel members → three marks out of 50, averaged to one /50 score).
                  </p>
                  <div className="grid gap-4">
                    <ScoreInput name="content" label="Content" max={10} description="Material support, engineering terms usage" />
                    <ScoreInput name="visuals" label="Visuals" max={10} description="Readability, graphics, slide composition" />
                    <ScoreInput name="presentationSkills" label="Presentation Skills" max={10} description="Clarity, confidence, audience engagement" />
                    <ScoreInput name="organization" label="Organization" max={10} description="Logical sequence, easy to follow" />
                    <ScoreInput name="handlingOfQuestions" label="Handling of Questions" max={30} description="Technical depth, research beyond curriculum" />
                  </div>
                </div>

                <Separator />

                {/* Report Section */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-foreground">Report Evaluation</h4>
                  <ScoreInput
                    name="reportScore"
                    label="Report Score"
                    max={10}
                    description="Visual format, organization, task details"
                  />
                </div>

                {/* Score Summary */}
                <div className="p-4 bg-muted rounded-lg space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span>Presentation average (yours):</span>
                    <span className="text-right font-medium">{presentationAvgDisplay.toFixed(2)}/10</span>

                    <span>Your internal (this sheet):</span>
                    <span className="text-right font-medium">{draftSingleInternal.toFixed(2)}/50</span>

                    <span>Internal averaged ({evaluatorCount} evaluator{evaluatorCount !== 1 ? 's' : ''}):</span>
                    <span className="text-right font-medium">{averagedInternalTotal.toFixed(2)}/50</span>

                    <span>External total:</span>
                    <span className="text-right font-medium">{watchedValues.externalTotal}/50</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Grand Total:</span>
                    <div className="text-right">
                      <span className="text-xl font-bold">{grandTotal.toFixed(1)}/100</span>
                      <Badge className="ml-2" variant={grandTotal >= 60 ? 'default' : 'destructive'}>
                        {currentGrade}
                      </Badge>
                    </div>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="remarks"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Remarks (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Additional comments about the student's performance..."
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    Submit Grade
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Student Grades
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>External (50)</TableHead>
                  <TableHead>Internal (50)</TableHead>
                  <TableHead>Grand Total</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentsLoading || gradesLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Loading…</p>
                    </TableCell>
                  </TableRow>
                ) : finalGradingStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No students with completed industrial 4-month marking yet.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  finalGradingStudents.map((student: Student) => {
                    const grade = grades.find((g) => String(g.studentUser) === String(student.id)) as FinalGrade | undefined;
                    const industryExt = industrialExternalFromStudent(student);
                    const externalTotal = grade?.externalTotal ?? industryExt;
                    const internalTotal = grade ? grade.internalTotal : 0;
                    const grandTotal = grade?.grandTotal ?? industryExt + internalTotal;
                    const gradeLetter = grade ? grade.grade : '-';

                    return (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell className="text-muted-foreground">{student.allocatedCompany || 'N/A'}</TableCell>
                        <TableCell className="text-muted-foreground">{Number(externalTotal).toFixed(1)}</TableCell>
                        <TableCell className="text-muted-foreground">{grade ? Number(internalTotal).toFixed(1) : '—'}</TableCell>
                        <TableCell className="text-muted-foreground">{grade ? Number(grandTotal).toFixed(1) : '—'}</TableCell>
                        <TableCell>
                          {grade ? (
                            <Badge variant={grandTotal >= 60 ? 'default' : 'destructive'}>
                              {gradeLetter}
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Not Graded</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleView(student)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="sm" onClick={() => handleGrade(student)}>
                              <Pencil className="h-4 w-4 mr-1" />
                              {grade ? 'Edit' : 'Grade'}
                            </Button>
                          </div>
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
    </DashboardLayout>
  );
}