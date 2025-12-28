import { useState, useMemo } from "react";
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { mockEvaluations } from '@/data/mockData';
import { ClipboardCheck, Plus, Eye, Pencil } from 'lucide-react';
import { Evaluation } from '@/types';

const evaluationSchema = z.object({
  studentId: z.string().min(1, "Please select a student"),
  month: z.string().min(1, "Please select a month"),
  problemAnalysis: z.number().min(0).max(10),
  modernToolUsage: z.number().min(0).max(10),
  ethics: z.number().min(0).max(10),
  individualTeamwork: z.number().min(0).max(10),
  communication: z.number().min(0).max(10),
  projectManagement: z.number().min(0).max(10),
  lifeLongLearning: z.number().min(0).max(10),
  remarks: z.string().min(10, "Please provide at least 10 characters of feedback").max(500, "Remarks must be less than 500 characters"),
});

type EvaluationFormData = z.infer<typeof evaluationSchema>;

const students = [
  { id: '1', name: 'Ahmad Razak', studentId: 'FUI/FURC/F-21-BSET-001' },
  { id: '2', name: 'Siti Aminah', studentId: 'FUI/FURC/F-21-BSET-003' },
  { id: '3', name: 'Muhammad Ali', studentId: 'FUI/FURC/F-21-BSET-004' },
];

const months = ['Month 1', 'Month 2', 'Month 3', 'Month 4'];

const ploCriteria = [
  { name: 'problemAnalysis', label: 'Problem Analysis', plo: 'PLO2', description: 'Ability to analyze problems and propose solutions' },
  { name: 'modernToolUsage', label: 'Modern Tool Usage', plo: 'PLO5', description: 'Knowledge and application of technical tools' },
  { name: 'ethics', label: 'Ethical Practice', plo: 'PLO8', description: 'Understanding and application of ethical concepts' },
  { name: 'individualTeamwork', label: 'Individual & Teamwork', plo: 'PLO9', description: 'Individual contribution and team collaboration' },
  { name: 'communication', label: 'Communication', plo: 'PLO10', description: 'Effective oral and written communication skills' },
  { name: 'projectManagement', label: 'Project Management', plo: 'PLO11', description: 'Task planning, timelines and resource management' },
  { name: 'lifeLongLearning', label: 'Lifelong Learning', plo: 'PLO12', description: 'Motivation to learn new technologies and skills' },
];

export default function IndustryEvaluations() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvaluation, setEditingEvaluation] = useState<Evaluation | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewEvaluation, setViewEvaluation] = useState<Evaluation | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<EvaluationFormData>({
    resolver: zodResolver(evaluationSchema),
    shouldFocusError: false, // prevent RHF from auto-focusing errors
    defaultValues: {
      studentId: "",
      month: "",
      problemAnalysis: 0,
      modernToolUsage: 0,
      ethics: 0,
      individualTeamwork: 0,
      communication: 0,
      projectManagement: 0,
      lifeLongLearning: 0,
      remarks: "",
    },
  });

  const [localScores, setLocalScores] = useState<EvaluationFormData>({
    studentId: "",
    month: "",
    problemAnalysis: 0,
    modernToolUsage: 0,
    ethics: 0,
    individualTeamwork: 0,
    communication: 0,
    projectManagement: 0,
    lifeLongLearning: 0,
    remarks: "",
  });

  const [hasInteracted, setHasInteracted] = useState(false);

  const handleCreate = () => {
    const defaultValues = {
      studentId: "",
      month: "",
      problemAnalysis: 0,
      modernToolUsage: 0,
      ethics: 0,
      individualTeamwork: 0,
      communication: 0,
      projectManagement: 0,
      lifeLongLearning: 0,
      remarks: "",
    };
    setEditingEvaluation(null);
    form.reset(defaultValues);
    setLocalScores(defaultValues);
    setHasInteracted(false);
    setIsDialogOpen(true);
  };

  const handleEdit = (evaluation: Evaluation) => {
    setEditingEvaluation(evaluation);
    const student = students.find(s => s.name === evaluation.studentName);
    const scorePerCategory = Math.round((evaluation.score / evaluation.maxScore) * 10);

    const editValues = {
      studentId: student?.id || "",
      month: "Month 1",
      problemAnalysis: scorePerCategory,
      modernToolUsage: scorePerCategory,
      ethics: scorePerCategory,
      individualTeamwork: scorePerCategory,
      communication: scorePerCategory,
      projectManagement: scorePerCategory,
      lifeLongLearning: scorePerCategory,
      remarks: evaluation.remarks,
    };
    form.reset(editValues);
    setLocalScores(editValues);
    setHasInteracted(true);
    setIsDialogOpen(true);
  };

  const calculateMonthlyTotal = (data: EvaluationFormData) => {
    const totalRaw = data.problemAnalysis + data.modernToolUsage + data.ethics +
      data.individualTeamwork + data.communication +
      data.projectManagement + data.lifeLongLearning;
    return (totalRaw / 70) * 12.5;
  };

  const onSubmit = (data: EvaluationFormData) => {
    const monthlyTotal = calculateMonthlyTotal(localScores);
    const selectedStudent = students.find(s => s.id === data.studentId);

    if (editingEvaluation) {
      toast({
        title: "Evaluation Updated",
        description: `${data.month} evaluation updated. Monthly Total: ${monthlyTotal.toFixed(2)}/12.5`,
      });
    } else {
      toast({
        title: "Evaluation Submitted",
        description: `${data.month} evaluation submitted for ${selectedStudent?.name}. Monthly Total: ${monthlyTotal.toFixed(2)}/12.5`,
      });
    }

    setIsDialogOpen(false);
    setEditingEvaluation(null);
    form.reset();
  };

  const handleView = (evaluation: Evaluation) => {
    setViewEvaluation(evaluation);
    setViewDialogOpen(true);
  };

  const ScoreSlider = ({ name, label, plo, description }: { name: keyof EvaluationFormData; label: string; plo: string; description: string }) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <div className="flex justify-between items-center">
            <div>
              <FormLabel className="flex items-center gap-2">
                {label}
                <Badge variant="outline" className="text-xs">{plo}</Badge>
              </FormLabel>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            <span className="text-sm font-medium text-primary">{localScores[name] as number}/10</span>
          </div>
          <FormControl>
            <Slider
              min={0}
              max={10}
              step={1}
              value={[localScores[name] as number]}
              onValueChange={(value) => {
                setLocalScores(prev => ({ ...prev, [name]: value[0] }));
                setHasInteracted(true);
              }}
              className="py-2"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const currentMonthlyTotal = useMemo(() => calculateMonthlyTotal(localScores), [localScores]);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <PageHeader
          title="Monthly Industrial Evaluations"
          description="Submit monthly PLO-based evaluations for interns (Each criterion carries 10 marks)"
          action={
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              New Evaluation
            </Button>
          }
        />

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent
            className="max-w-2xl max-h-[90vh] overflow-y-auto"
            onOpenAutoFocus={(e) => e.preventDefault()} // ✅ prevent auto scroll/focus
          >
            <DialogHeader>
              <DialogTitle>
                {editingEvaluation ? "Edit Evaluation" : "Monthly Industrial Evaluation"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="studentId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Student</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a student" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {students.map((student) => (
                              <SelectItem key={student.id} value={student.id}>
                                {student.name} ({student.studentId})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="month"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Evaluation Month</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select month" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {months.map((month) => (
                              <SelectItem key={month} value={month}>
                                {month}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-semibold text-foreground">PLO-Based Performance Ratings</h4>
                    <p className="text-sm text-muted-foreground">Each column carries 10 marks</p>
                  </div>
                  <div className="grid gap-5">
                    {ploCriteria.map((criteria) => (
                      <ScoreSlider
                        key={criteria.name}
                        name={criteria.name as keyof EvaluationFormData}
                        label={criteria.label}
                        plo={criteria.plo}
                        description={criteria.description}
                      />
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Monthly Total (Max 12.5):</span>
                    <span className="text-xl font-bold text-primary">
                      {hasInteracted ? `${currentMonthlyTotal.toFixed(2)}/12.5` : "--/12.5"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Grand Total for 4 months = 50 marks
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="remarks"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supervisor Remarks</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Provide detailed feedback on the intern's performance, areas of improvement, and achievements..."
                          className="min-h-[100px]"
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
                    {editingEvaluation ? "Update Evaluation" : "Submit Evaluation"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>View Evaluation</DialogTitle>
            </DialogHeader>
            {viewEvaluation ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h5 className="text-sm font-medium">Student</h5>
                    <p className="text-muted-foreground">{viewEvaluation.studentName}</p>
                  </div>
                  <div>
                    <h5 className="text-sm font-medium">Month</h5>
                    <p className="text-muted-foreground">{viewEvaluation.type === 'monthly' ? 'Month 1' : 'Month 2'}</p>
                  </div>
                  <div>
                    <h5 className="text-sm font-medium">Date</h5>
                    <p className="text-muted-foreground">{viewEvaluation.date}</p>
                  </div>
                  <div>
                    <h5 className="text-sm font-medium">Score</h5>
                    <p className="text-muted-foreground">{viewEvaluation.score}/{viewEvaluation.maxScore}</p>
                  </div>
                </div>

                <div className="p-3 bg-muted rounded">
                  <h5 className="text-sm font-medium">Monthly Total</h5>
                  <p className="text-foreground text-lg font-bold">{((viewEvaluation.score / viewEvaluation.maxScore) * 12.5).toFixed(2)}/12.5</p>
                </div>

                <div>
                  <h5 className="text-sm font-medium">Remarks</h5>
                  <p className="text-muted-foreground">{viewEvaluation.remarks}</p>
                </div>

                <div className="flex justify-end">
                  <Button variant="outline" onClick={() => setViewDialogOpen(false)}>Close</Button>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Submitted Evaluations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Month</TableHead>
                  <TableHead>Monthly Total</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockEvaluations.map((evaluation) => {
                  const monthlyTotal = ((evaluation.score / evaluation.maxScore) * 12.5).toFixed(2);
                  return (
                    <TableRow key={evaluation.id}>
                      <TableCell className="font-medium">{evaluation.studentName}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {evaluation.type === 'monthly' ? 'Month 1' : 'Month 2'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {monthlyTotal}/12.5
                      </TableCell>
                      <TableCell className="text-muted-foreground">{evaluation.date}</TableCell>
                      <TableCell>
                        <Badge variant="default">Submitted</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleView(evaluation)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleEdit(evaluation)}>
                            <Pencil className="h-4 w-4" />
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
    </DashboardLayout>
  );
}
