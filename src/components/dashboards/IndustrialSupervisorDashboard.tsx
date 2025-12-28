import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from '@/components/ui/badge';
import { mockStudents, mockEvaluations } from '@/data/mockData';
import { GraduationCap, ClipboardCheck, MessageSquare, Calendar, Eye } from 'lucide-react';
import { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Evaluation } from '@/types';

// PLO-based evaluation schema matching the Industry Evaluation Sheet
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

const months = [
  'Month 1', 'Month 2', 'Month 3', 'Month 4'
];

// PLO criteria with descriptions
const ploCriteria = [
  { name: 'problemAnalysis', label: 'Problem Analysis', plo: 'PLO2', description: 'Ability to analyze problems and propose solutions' },
  { name: 'modernToolUsage', label: 'Modern Tool Usage', plo: 'PLO5', description: 'Knowledge and application of technical tools' },
  { name: 'ethics', label: 'Ethical Practice', plo: 'PLO8', description: 'Understanding and application of ethical concepts' },
  { name: 'individualTeamwork', label: 'Individual & Teamwork', plo: 'PLO9', description: 'Individual contribution and team collaboration' },
  { name: 'communication', label: 'Communication', plo: 'PLO10', description: 'Effective oral and written communication skills' },
  { name: 'projectManagement', label: 'Project Management', plo: 'PLO11', description: 'Task planning, timelines and resource management' },
  { name: 'lifeLongLearning', label: 'Lifelong Learning', plo: 'PLO12', description: 'Motivation to learn new technologies and skills' },
];

export function IndustrialSupervisorDashboard() {
  const assignedStudents = mockStudents.filter(s => s.currentStatus === 'allocated');
  const [isEvaluateDialogOpen, setIsEvaluateDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<typeof mockStudents[0] | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState<typeof mockEvaluations[0] | null>(null);
  const { toast } = useToast();

  const form = useForm<EvaluationFormData>({
    resolver: zodResolver(evaluationSchema),
    defaultValues: {
      studentId: "",
      month: "",
      problemAnalysis: 7,
      modernToolUsage: 7,
      ethics: 7,
      individualTeamwork: 7,
      communication: 7,
      projectManagement: 7,
      lifeLongLearning: 7,
      remarks: "",
    },
  });

  const handleEvaluate = (student: typeof mockStudents[0]) => {
    setSelectedStudent(student);
    const studentData = students.find(s => s.name === student.name);
    form.reset({
      studentId: studentData?.id || "",
      month: "",
      problemAnalysis: 7,
      modernToolUsage: 7,
      ethics: 7,
      individualTeamwork: 7,
      communication: 7,
      projectManagement: 7,
      lifeLongLearning: 7,
      remarks: "",
    });
    setIsEvaluateDialogOpen(true);
  };

  const handleView = (evaluation: typeof mockEvaluations[0]) => {
    setSelectedEvaluation(evaluation);
    setIsViewDialogOpen(true);
  };

  // Calculate monthly total (each column is 10 marks, 7 columns = 70 marks, converted to 12.5 max)
  const calculateMonthlyTotal = (data: EvaluationFormData) => {
    const totalRaw = data.problemAnalysis + data.modernToolUsage + data.ethics + 
                     data.individualTeamwork + data.communication + 
                     data.projectManagement + data.lifeLongLearning;
    // Convert 70 marks to 12.5 scale (as per sheet)
    return (totalRaw / 70) * 12.5;
  };

  const onSubmit = (data: EvaluationFormData) => {
    const monthlyTotal = calculateMonthlyTotal(data);
    const selectedStudentData = students.find(s => s.id === data.studentId);
    
    toast({
      title: "Evaluation Submitted",
      description: `${data.month} evaluation submitted for ${selectedStudentData?.name}. Monthly Total: ${monthlyTotal.toFixed(2)}/12.5`,
    });
    
    setIsEvaluateDialogOpen(false);
    setSelectedStudent(null);
    form.reset();
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
            <span className="text-sm font-medium text-primary">{field.value as number}/10</span>
          </div>
          <FormControl>
            <Slider
              min={0}
              max={10}
              step={1}
              value={[field.value as number]}
              onValueChange={(value) => field.onChange(value[0])}
              className="py-2"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  // Watch form values for live calculation
  const watchedValues = form.watch();
  const currentMonthlyTotal = calculateMonthlyTotal(watchedValues as EvaluationFormData);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Industrial Supervisor Dashboard"
        description="Manage intern evaluations and communication"
      />

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Assigned Interns"
          value={assignedStudents.length}
          description="Under supervision"
          icon={<GraduationCap className="h-5 w-5" />}
        />
        <StatCard
          title="Evaluations Submitted"
          value={mockEvaluations.length}
          description="This cycle"
          icon={<ClipboardCheck className="h-5 w-5" />}
        />
        <StatCard
          title="Pending Evaluations"
          value={1}
          description="Due this month"
          icon={<Calendar className="h-5 w-5" />}
        />
        <StatCard
          title="Messages"
          value={3}
          description="From supervisors"
          icon={<MessageSquare className="h-5 w-5" />}
        />
      </div>

      {/* Assigned Interns */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Assigned Interns
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Student ID</TableHead>
                <TableHead>Specialization</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignedStudents.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">{student.name}</TableCell>
                  <TableCell className="text-muted-foreground">{student.studentId}</TableCell>
                  <TableCell className="text-muted-foreground">{student.specialization}</TableCell>
                  <TableCell className="text-muted-foreground">2024-02-01</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => handleEvaluate(student)}>
                      Evaluate
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Evaluations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Recent Evaluations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockEvaluations.map((evaluation) => (
                <TableRow key={evaluation.id}>
                  <TableCell className="font-medium">{evaluation.studentName}</TableCell>
                  <TableCell className="text-muted-foreground capitalize">{evaluation.type}</TableCell>
                  <TableCell className="text-muted-foreground">{evaluation.score}/{evaluation.maxScore}</TableCell>
                  <TableCell className="text-muted-foreground">{evaluation.date}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => handleView(evaluation)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Evaluate Dialog */}
      <Dialog open={isEvaluateDialogOpen} onOpenChange={setIsEvaluateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Monthly Industrial Evaluation</DialogTitle>
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
                    {currentMonthlyTotal.toFixed(2)}/12.5
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
                <Button type="button" variant="outline" onClick={() => setIsEvaluateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Submit Evaluation
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View Evaluation Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>View Evaluation</DialogTitle>
          </DialogHeader>
          {selectedEvaluation ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h5 className="text-sm font-medium">Student</h5>
                  <p className="text-muted-foreground">{selectedEvaluation.studentName}</p>
                </div>
                <div>
                  <h5 className="text-sm font-medium">Month</h5>
                  <p className="text-muted-foreground">{selectedEvaluation.type === 'monthly' ? 'Month 1' : 'Month 2'}</p>
                </div>
                <div>
                  <h5 className="text-sm font-medium">Date</h5>
                  <p className="text-muted-foreground">{selectedEvaluation.date}</p>
                </div>
                <div>
                  <h5 className="text-sm font-medium">Score</h5>
                  <p className="text-muted-foreground">{selectedEvaluation.score}/{selectedEvaluation.maxScore}</p>
                </div>
              </div>

              <div className="p-3 bg-muted rounded">
                <h5 className="text-sm font-medium">Monthly Total</h5>
                <p className="text-foreground text-lg font-bold">{((selectedEvaluation.score / selectedEvaluation.maxScore) * 12.5).toFixed(2)}/12.5</p>
              </div>

              <div>
                <h5 className="text-sm font-medium">Remarks</h5>
                <p className="text-muted-foreground">{selectedEvaluation.remarks}</p>
              </div>

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Close</Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
