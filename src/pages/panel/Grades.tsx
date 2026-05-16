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
import { useRealtimePanelStudents, useRealtimePanelFinalGrades } from '@/hooks/use-realtime-data';
import { Award, Download, Eye, Pencil } from 'lucide-react';
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Student } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import {
  panelMemberHasMarkedStudent,
  studentsEligibleForPanelFinalGrading,
} from '@/lib/panelGrading';

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

interface PanelFinalGrade {
  _id?: string;
  studentUser: string;
  studentName?: string;
  externalTotal: number;
  internalTotal: number;
  grandTotal: number;
  grade: string;
  content: number;
  visuals: number;
  presentationSkills: number;
  organization: number;
  handlingOfQuestions: number;
  modernToolUsage?: number;
  ethics?: number;
  reportScore: number;
  remarks?: string;
  internalEvaluations?: InternalEvalContribution[];
}

const gradeSchema = z.object({
  content: z.number().min(0).max(10),
  visuals: z.number().min(0).max(10),
  presentationSkills: z.number().min(0).max(10),
  organization: z.number().min(0).max(10),
  handlingOfQuestions: z.number().min(0).max(20),
  modernToolUsage: z.number().min(0).max(5),
  ethics: z.number().min(0).max(5),
  reportScore: z.number().min(0).max(10),
  remarks: z.string().max(500, "Remarks must be less than 500 characters").optional(),
});

type GradeFormData = z.infer<typeof gradeSchema>;

export default function PanelGrades() {
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewingGrade, setViewingGrade] = useState<PanelFinalGrade | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const { toast } = useToast();

  const { data: students = [], loading: studentsLoading } = useRealtimePanelStudents();
  const { data: finalGrades = [], loading: gradesLoading, refresh: refreshGrades } = useRealtimePanelFinalGrades();

  const loading = studentsLoading || gradesLoading;
  const finalGradingStudents = studentsEligibleForPanelFinalGrading(students);
  const hasMarkedByCurrentEvaluator = (studentId: string) =>
    panelMemberHasMarkedStudent(studentId, finalGrades, user?.id);
  const pendingStudents = finalGradingStudents.filter(
    (s: Student) => !hasMarkedByCurrentEvaluator(s.id)
  );

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
      remarks: "",
    },
  });

  const handleGrade = (student: Student) => {
    setSelectedStudent(student);
    const existingGrade = finalGrades.find((g: any) => String(g.studentUser) === student.id) as
      | PanelFinalGrade
      | undefined;

    const my =
      existingGrade?.internalEvaluations?.find((e: InternalEvalContribution) => String(e.evaluatorUser) === String(user?.id)) ||
      ((!existingGrade?.internalEvaluations?.length || existingGrade.internalEvaluations.length === 0) && existingGrade
        ? existingGrade
        : undefined);

    form.reset({
      content: my?.content ?? 7,
      visuals: my?.visuals ?? 7,
      presentationSkills: my?.presentationSkills ?? 7,
      organization: my?.organization ?? 7,
      handlingOfQuestions: Math.min(my?.handlingOfQuestions ?? 14, 20),
      modernToolUsage: my?.modernToolUsage ?? 3,
      ethics: my?.ethics ?? 3,
      reportScore: my?.reportScore ?? 7,
      remarks: my?.remarks ?? '',
    });
    setIsDialogOpen(true);
  };

  const handleView = (student: Student) => {
    const g = finalGrades.find((x: any) => String(x.studentUser) === student.id) as PanelFinalGrade | undefined;
    if (!g) {
      toast({ title: 'No grade yet', variant: 'destructive' });
      return;
    }
    setViewingGrade(g);
    setIsViewOpen(true);
  };

  const calculateTotals = (data: GradeFormData) => {
    const presentationAvg = (data.content + data.visuals + data.presentationSkills + data.organization) / 4;
    const internalTotal =
      presentationAvg +
      data.handlingOfQuestions +
      data.modernToolUsage +
      data.ethics +
      data.reportScore;
    return { presentationAvg, internalTotal };
  };

  const getMyInternalFromGrade = (grade: PanelFinalGrade | undefined) => {
    if (!grade || !user?.id) return null;
    const mine = grade.internalEvaluations?.find(
      (e) => String(e.evaluatorUser) === String(user.id)
    );
    return mine ? Number(mine.internalTotal) : null;
  };

  const getMyContribution = (grade: PanelFinalGrade | undefined) => {
    if (!grade || !user?.id) return undefined;
    return grade.internalEvaluations?.find((e) => String(e.evaluatorUser) === String(user.id));
  };

  const onSubmit = async (data: GradeFormData) => {
    if (!selectedStudent) return;

    try {
      const { submitPanelFinalGrade } = await import('@/lib/api');
      await submitPanelFinalGrade({
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
        title: 'Grade submitted',
        description: `Your internal marks for ${selectedStudent?.name} are saved (out of 50).`,
      });

      refreshGrades();
      setIsDialogOpen(false);
      setSelectedStudent(null);
      form.reset();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to submit grade. Please try again.";
      toast({
        title: "Error",
        description: message,
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

  const watchedValues = form.watch();
  const draftSingleInternal = calculateTotals(watchedValues as GradeFormData).internalTotal;
  const presentationAvgDisplay =
    ((watchedValues as GradeFormData).content +
      (watchedValues as GradeFormData).visuals +
      (watchedValues as GradeFormData).presentationSkills +
      (watchedValues as GradeFormData).organization) /
    4;

  const renderRubricBreakdown = (source: {
    content?: number;
    visuals?: number;
    presentationSkills?: number;
    organization?: number;
    handlingOfQuestions?: number;
    modernToolUsage?: number;
    ethics?: number;
    reportScore?: number;
  }) => (
    <div className="grid grid-cols-2 gap-2 text-sm rounded-lg border p-3">
      <span className="text-muted-foreground">Content</span>
      <span className="text-right tabular-nums font-medium">{source.content?.toFixed(2) ?? '—'}/10</span>
      <span className="text-muted-foreground">Visuals</span>
      <span className="text-right tabular-nums font-medium">{source.visuals?.toFixed(2) ?? '—'}/10</span>
      <span className="text-muted-foreground">Presentation skills</span>
      <span className="text-right tabular-nums font-medium">{source.presentationSkills?.toFixed(2) ?? '—'}/10</span>
      <span className="text-muted-foreground">Organization</span>
      <span className="text-right tabular-nums font-medium">{source.organization?.toFixed(2) ?? '—'}/10</span>
      <span className="text-muted-foreground">Handling of Questions</span>
      <span className="text-right tabular-nums font-medium">{source.handlingOfQuestions?.toFixed(2) ?? '—'}/20</span>
      <span className="text-muted-foreground">Modern Tool Usage</span>
      <span className="text-right tabular-nums font-medium">{(source.modernToolUsage ?? 0).toFixed(2)}/5</span>
      <span className="text-muted-foreground">Ethics</span>
      <span className="text-right tabular-nums font-medium">{(source.ethics ?? 0).toFixed(2)}/5</span>
      <span className="text-muted-foreground">Report</span>
      <span className="text-right tabular-nums font-medium">{source.reportScore?.toFixed(2) ?? '—'}/10</span>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <PageHeader
          title="Final Grading"
          description="Students pending your internal evaluation appear here (after industrial 4-month marking is complete). After you submit, they move to Evaluations."
          action={
            <Button>
              <Download className="h-4 w-4 mr-2" />
              Export Grades
            </Button>
          }
        />

        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>View grades: {viewingGrade?.studentName}</DialogTitle>
            </DialogHeader>
            {viewingGrade && (
              <div className="space-y-4">
                <div className="rounded-lg bg-muted/50 p-4 text-sm">
                  <span className="font-medium">Your internal marks</span>
                  <p className="text-2xl font-bold tabular-nums mt-1">
                    {(getMyInternalFromGrade(viewingGrade) ?? viewingGrade.internalTotal).toFixed(2)}/50
                  </p>
                </div>
                {renderRubricBreakdown(getMyContribution(viewingGrade) ?? viewingGrade)}
                <div className="flex justify-end">
                  <Button type="button" variant="outline" onClick={() => setIsViewOpen(false)}>Close</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Grade Student: {selectedStudent?.name}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-foreground">Internal Evaluation</h4>
                  <p className="text-xs text-muted-foreground">
                    Enter your marks out of 50 total (presentation, HOQ, modern tool usage, ethics, and report).
                  </p>
                  <div className="grid gap-4">
                    <ScoreInput name="content" label="Content" max={10} description="Material support, engineering terms usage" />
                    <ScoreInput name="visuals" label="Visuals" max={10} description="Readability, graphics, slide composition" />
                    <ScoreInput name="presentationSkills" label="Presentation Skills" max={10} description="Clarity, confidence, audience engagement" />
                    <ScoreInput name="organization" label="Organization" max={10} description="Logical sequence, easy to follow" />
                    <ScoreInput name="handlingOfQuestions" label="Handling of Questions" max={20} description="Technical depth, research beyond curriculum" />
                    <ScoreInput name="modernToolUsage" label="Modern Tool Usage" max={5} description="Application of technical tools and skills (PLO5)" />
                    <ScoreInput name="ethics" label="Ethics" max={5} description="Professional and ethical conduct in the workplace (PLO8)" />
                    <ScoreInput name="reportScore" label="Report Score" max={10} description="Visual format, organization, task details" />
                  </div>
                </div>

                <div className="p-4 bg-muted rounded-lg space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span>Presentation average:</span>
                    <span className="text-right font-medium tabular-nums">{presentationAvgDisplay.toFixed(2)}/10</span>
                    <span>Handling of Questions:</span>
                    <span className="text-right font-medium tabular-nums">{(watchedValues as GradeFormData).handlingOfQuestions}/20</span>
                    <span>Modern Tool Usage:</span>
                    <span className="text-right font-medium tabular-nums">{(watchedValues as GradeFormData).modernToolUsage}/5</span>
                    <span>Ethics:</span>
                    <span className="text-right font-medium tabular-nums">{(watchedValues as GradeFormData).ethics}/5</span>
                    <span>Report score:</span>
                    <span className="text-right font-medium tabular-nums">{(watchedValues as GradeFormData).reportScore}/10</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Your internal total</span>
                    <span className="text-xl font-bold tabular-nums">{draftSingleInternal.toFixed(2)}/50</span>
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
              Pending Final Grading
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : pendingStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No students pending your final grading. Completed students are listed under Evaluations.
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingStudents.map((student: Student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell className="text-muted-foreground">{student.allocatedCompany || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">Pending</Badge>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" onClick={() => handleGrade(student)}>
                          <Pencil className="h-4 w-4 mr-1" />
                          Grade
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
    </DashboardLayout>
  );
}

