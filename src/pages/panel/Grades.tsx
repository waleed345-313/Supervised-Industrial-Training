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
import { Award, Eye, Pencil } from 'lucide-react';
import { FinalGradingScoreInput } from "@/components/shared/FinalGradingScoreInput";
import { Student } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import {
  clampHandlingOfQuestions,
  panelMemberHasMarkedStudent,
  studentsEligibleForPanelFinalGrading,
} from '@/lib/panelGrading';
import { FinalGradingInternalMarkingSummary } from '@/components/shared/FinalGradingInternalMarkingSummary';
import { FinalGradingRubricBreakdown } from '@/components/shared/FinalGradingRubricBreakdown';
import { FinalGradingInternalSummaryCard } from '@/components/shared/FinalGradingInternalSummaryCard';

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
      handlingOfQuestions: clampHandlingOfQuestions(my?.handlingOfQuestions),
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

  const watchedValues = form.watch() as GradeFormData;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <PageHeader
          title="Final Grading"
          description="Students pending your internal evaluation appear here (after industrial 4-month marking is complete). After you submit, they move to Evaluations."
        />

        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>View grades: {viewingGrade?.studentName}</DialogTitle>
            </DialogHeader>
            {viewingGrade && (
              <div className="space-y-4">
                <FinalGradingInternalSummaryCard
                  internalOutOf50={
                    getMyInternalFromGrade(viewingGrade) ?? viewingGrade.internalTotal
                  }
                />
                <FinalGradingRubricBreakdown
                  source={getMyContribution(viewingGrade) ?? viewingGrade}
                />
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

