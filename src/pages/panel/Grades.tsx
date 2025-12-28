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
import { mockStudents, mockCompanies, mockEvaluations } from '@/data/mockData';
import { Award, Download, Eye, Pencil } from 'lucide-react';
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";

// Internal Evaluation schema based on the SIT-2 Internal Evaluation Sheet
const gradeSchema = z.object({
  // Presentation Rubrics (each out of 10, totaled differently)
  content: z.number().min(0).max(10),
  visuals: z.number().min(0).max(10),
  presentationSkills: z.number().min(0).max(10),
  organization: z.number().min(0).max(10),
  handlingOfQuestions: z.number().min(0).max(30),
  // Report Score
  reportScore: z.number().min(0).max(10),
  // External score from Industrial Supervisor (auto-calculated, but editable)
  externalTotal: z.number().min(0).max(50),
  remarks: z.string().max(500, "Remarks must be less than 500 characters").optional(),
});

type GradeFormData = z.infer<typeof gradeSchema>;

export default function PanelGrades() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<typeof allocatedStudents[0] | null>(null);
  const { toast } = useToast();
  
  const allocatedStudents = mockStudents.filter(s => s.currentStatus === 'allocated');

  const form = useForm<GradeFormData>({
    resolver: zodResolver(gradeSchema),
    defaultValues: {
      content: 7,
      visuals: 7,
      presentationSkills: 7,
      organization: 7,
      handlingOfQuestions: 20,
      reportScore: 7,
      externalTotal: 40,
      remarks: "",
    },
  });

  const handleGrade = (student: typeof allocatedStudents[0]) => {
    setSelectedStudent(student);
    const evaluation = mockEvaluations.find(e => e.studentId === student.id);
    // Calculate external total from industrial supervisor (50 marks max)
    const externalTotal = evaluation ? (evaluation.score / evaluation.maxScore) * 50 : 40;
    
    form.reset({
      content: 7,
      visuals: 7,
      presentationSkills: 7,
      organization: 7,
      handlingOfQuestions: 20,
      reportScore: 7,
      externalTotal: Math.round(externalTotal),
      remarks: "",
    });
    setIsDialogOpen(true);
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

  const onSubmit = (data: GradeFormData) => {
    const { grandTotal } = calculateTotals(data);
    const grade = getGradeLetter(grandTotal);
    
    toast({
      title: "Grade Submitted",
      description: `Final grade for ${selectedStudent?.name}: ${grandTotal.toFixed(1)}% (${grade})`,
    });
    
    setIsDialogOpen(false);
    setSelectedStudent(null);
    form.reset();
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

  // Watch form values for live calculation
  const watchedValues = form.watch();
  const { presentationAvg, internalTotal, grandTotal } = calculateTotals(watchedValues as GradeFormData);
  const currentGrade = getGradeLetter(grandTotal);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <PageHeader
          title="Final Grades - Internal Evaluation"
          description="Evaluate student presentations and reports (Internal: 50 marks + External: 50 marks = 100 marks)"
          action={
            <Button>
              <Download className="h-4 w-4 mr-2" />
              Export Grades
            </Button>
          }
        />

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
                    <span>Presentation Average:</span>
                    <span className="text-right font-medium">{presentationAvg.toFixed(2)}/10</span>
                    
                    <span>Internal Total:</span>
                    <span className="text-right font-medium">{internalTotal.toFixed(2)}/50</span>
                    
                    <span>External Total:</span>
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
                {allocatedStudents.map((student) => {
                  const company = mockCompanies.find(c => c.name === student.allocatedCompany);
                  const evaluation = mockEvaluations.find(e => e.studentId === student.id);
                  const externalTotal = evaluation ? (evaluation.score / evaluation.maxScore) * 50 : 40;
                  // Mock internal scores
                  const internalTotal = 35;
                  const grandTotal = externalTotal + internalTotal;
                  const grade = getGradeLetter(grandTotal);
                  
                  return (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell className="text-muted-foreground">{company?.name || student.allocatedCompany || 'N/A'}</TableCell>
                      <TableCell className="text-muted-foreground">{externalTotal.toFixed(1)}</TableCell>
                      <TableCell className="text-muted-foreground">{internalTotal}</TableCell>
                      <TableCell className="text-muted-foreground">{grandTotal.toFixed(1)}</TableCell>
                      <TableCell>
                        <Badge variant={grandTotal >= 60 ? 'default' : 'destructive'}>
                          {grade}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" onClick={() => handleGrade(student)}>
                            <Pencil className="h-4 w-4 mr-1" />
                            Grade
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
