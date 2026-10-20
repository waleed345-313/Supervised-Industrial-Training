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
import { submitFinalGrade } from '@/lib/api';
import { Award, Eye, Pencil } from 'lucide-react';
import { Separator } from "@/components/ui/separator";
import { FinalGradingScoreInput } from "@/components/shared/FinalGradingScoreInput";
import { FinalGradingInternalMarkingSummary } from "@/components/shared/FinalGradingInternalMarkingSummary";
import { FinalGradingRubricBreakdown } from "@/components/shared/FinalGradingRubricBreakdown";
import { FinalGradingInternalSummaryCard } from "@/components/shared/FinalGradingInternalSummaryCard";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/contexts/AuthContext";
import type { Student } from "@/types";
import { industrialExternalFromStudent } from "@/lib/utils";
import { clampHandlingOfQuestions } from "@/lib/panelGrading";

interface InternalEvalContribution {
  evaluatorUser: string;
  evaluatorName: string;
  evaluatorRole: string;
  content: number;
  visuals: number;
  presentationSkills: number;
  organization: number;
  handlingOfQuestions: number;
  modernToolUsage?: number;
  ethics?: number;
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
  modernToolUsage?: number;
  ethics?: number;
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
  handlingOfQuestions: z.number().min(0).max(20),
  modernToolUsage: z.number().min(0).max(5),
  ethics: z.number().min(0).max(5),
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
      handlingOfQuestions: 14,
      modernToolUsage: 3,
      ethics: 3,
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
      handlingOfQuestions: clampHandlingOfQuestions(my?.handlingOfQuestions),
      modernToolUsage: my?.modernToolUsage ?? 3,
      ethics: my?.ethics ?? 3,
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

  const getMyContribution = (grade: FinalGrade | undefined) => {
    if (!grade || !user?.id) return undefined;
    return grade.internalEvaluations?.find((e) => String(e.evaluatorUser) === String(user.id));
  };

  const getMyInternalFromGrade = (grade: FinalGrade | undefined) => {
    const mine = getMyContribution(grade);
    return mine ? Number(mine.internalTotal) : null;
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
        modernToolUsage: data.modernToolUsage,
        ethics: data.ethics,
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

  const ExternalScoreInput = () => (
    <FormField
      control={form.control}
      name="externalTotal"
      render={({ field }) => (
        <FormItem>
          <div className="flex justify-between items-center">
            <div>
              <FormLabel>Total External Score</FormLabel>
              <p className="text-xs text-muted-foreground">
                Sum of 4 monthly evaluations from Industrial Supervisor
              </p>
            </div>
            <span className="text-sm font-medium">{field.value as number}/50</span>
          </div>
          <FormControl>
            <Slider
              value={[field.value as number]}
              onValueChange={(value) => field.onChange(value[0])}
              min={0}
              max={50}
              step={0.5}
              className="py-2"
              disabled
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const watchedValues = form.watch() as GradeFormData;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <PageHeader
          title="Final Grades - Internal Evaluation"
          description="Lists students only after industrial 4‑month marking (50 marks). Panel members and supervisors each grade out of 50 internally; totals use the average so the internal component stays /50."
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
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg text-sm">
                  <div>
                    <span className="font-medium">External total</span>
                    <p className="text-muted-foreground tabular-nums">{viewingGrade.externalTotal.toFixed(2)}/50</p>
                  </div>
                  <div>
                    <span className="font-medium">Internal averaged</span>
                    <p className="text-muted-foreground tabular-nums">{viewingGrade.internalTotal.toFixed(2)}/50</p>
                  </div>
                  <div>
                    <span className="font-medium">Grand total</span>
                    <p className="text-lg font-bold tabular-nums">{viewingGrade.grandTotal.toFixed(1)}/100</p>
                  </div>
                  <div>
                    <span className="font-medium">Final grade</span>
                    <Badge className="mt-1" variant={viewingGrade.grandTotal >= 60 ? "default" : "destructive"}>
                      {viewingGrade.grade}
                    </Badge>
                  </div>
                </div>

                <Separator />

                <h4 className="font-semibold text-foreground">Your internal marks</h4>
                <FinalGradingInternalSummaryCard
                  internalOutOf50={
                    getMyInternalFromGrade(viewingGrade) ?? viewingGrade.internalTotal
                  }
                />
                <FinalGradingRubricBreakdown
                  source={getMyContribution(viewingGrade) ?? viewingGrade}
                />

                {viewingGrade.remarks && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Remarks</h4>
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
                  <ExternalScoreInput />
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-semibold text-foreground">Internal Evaluation</h4>
                  <p className="text-xs text-muted-foreground">
                    Enter your marks out of 50 total (presentation, HOQ, modern tool usage, ethics, and report). Same rubric as the evaluation panel.
                  </p>
                  <div className="grid gap-4">
                    <FinalGradingScoreInput control={form.control} name="content" rubricKey="content" label="Content" max={10} description="Material support, engineering terms usage" />
                    <FinalGradingScoreInput control={form.control} name="visuals" rubricKey="visuals" label="Visuals" max={10} description="Readability, graphics, slide composition" />
                    <FinalGradingScoreInput control={form.control} name="presentationSkills" rubricKey="presentationSkills" label="Presentation Skills" max={10} description="Clarity, confidence, audience engagement" />
                    <FinalGradingScoreInput control={form.control} name="organization" rubricKey="organization" label="Organization" max={10} description="Logical sequence, easy to follow" />
                    <FinalGradingScoreInput control={form.control} name="handlingOfQuestions" rubricKey="handlingOfQuestions" label="Handling of Questions" max={20} description="Technical depth, research beyond curriculum" />
                    <FinalGradingScoreInput control={form.control} name="modernToolUsage" rubricKey="modernToolUsage" label="Modern Tool Usage" max={5} description="Application of technical tools and skills (PLO5)" step={1} />
                    <FinalGradingScoreInput control={form.control} name="ethics" rubricKey="ethics" label="Ethics" max={5} description="Professional and ethical conduct in the workplace (PLO8)" step={1} />
                    <FinalGradingScoreInput control={form.control} name="reportScore" rubricKey="reportScore" label="Report Score" max={10} description="Visual format, organization, task details" />
                  </div>
                </div>

                <FinalGradingInternalMarkingSummary marks={watchedValues} />

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