import { useState } from "react";
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { mockStudents, mockCompanies } from '@/data/mockData';
import { MessageSquare, Send, Eye, Pencil } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";

const feedbackSchema = z.object({
  studentId: z.string().min(1, "Please select a student"),
  performanceRating: z.number().min(1).max(10),
  attendanceRating: z.number().min(1).max(10),
  professionalismRating: z.number().min(1).max(10),
  technicalSkillsRating: z.number().min(1).max(10),
  communicationRating: z.number().min(1).max(10),
  remarks: z.string().min(10, "Please provide detailed remarks (at least 10 characters)").max(500, "Remarks must be less than 500 characters"),
  recommendation: z.string().min(1, "Please select a recommendation"),
});

type FeedbackFormData = z.infer<typeof feedbackSchema>;

const recommendations = [
  { value: 'highly_recommend', label: 'Highly Recommend for Hiring' },
  { value: 'recommend', label: 'Recommend' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'not_recommend', label: 'Do Not Recommend' },
];

// Mock feedback data
const mockFeedback = [
  {
    id: '1',
    studentId: 'std1',
    studentName: 'Ahmad Ibrahim',
    overallScore: 8.5,
    status: 'submitted',
    submittedDate: '2024-02-15',
    recommendation: 'highly_recommend',
  },
  {
    id: '2',
    studentId: 'std2',
    studentName: 'Sarah Lee',
    overallScore: 7.8,
    status: 'draft',
    submittedDate: null,
    recommendation: 'recommend',
  },
];

export default function CompanyFeedback() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFeedback, setEditingFeedback] = useState<typeof mockFeedback[0] | null>(null);
  const { toast } = useToast();
  
  const allocatedStudents = mockStudents.filter(s => s.currentStatus === 'allocated');

  const form = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      studentId: "",
      performanceRating: 5,
      attendanceRating: 5,
      professionalismRating: 5,
      technicalSkillsRating: 5,
      communicationRating: 5,
      remarks: "",
      recommendation: "",
    },
  });

  const handleCreate = () => {
    setEditingFeedback(null);
    form.reset({
      studentId: "",
      performanceRating: 5,
      attendanceRating: 5,
      professionalismRating: 5,
      technicalSkillsRating: 5,
      communicationRating: 5,
      remarks: "",
      recommendation: "",
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (feedback: typeof mockFeedback[0]) => {
    setEditingFeedback(feedback);
    form.reset({
      studentId: feedback.studentId,
      performanceRating: 8,
      attendanceRating: 9,
      professionalismRating: 8,
      technicalSkillsRating: 8,
      communicationRating: 9,
      remarks: "Good performance overall",
      recommendation: feedback.recommendation,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: FeedbackFormData) => {
    const avgScore = (
      data.performanceRating +
      data.attendanceRating +
      data.professionalismRating +
      data.technicalSkillsRating +
      data.communicationRating
    ) / 5;

    toast({
      title: editingFeedback ? "Feedback Updated" : "Feedback Submitted",
      description: `Feedback ${editingFeedback ? 'updated' : 'submitted'} successfully. Overall score: ${avgScore.toFixed(1)}/10`,
    });
    
    setIsDialogOpen(false);
    setEditingFeedback(null);
    form.reset();
  };

  const ScoreSlider = ({ name, label }: { name: keyof FeedbackFormData; label: string }) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <div className="flex justify-between items-center">
            <FormLabel>{label}</FormLabel>
            <span className="text-sm font-medium">{field.value as number}/10</span>
          </div>
          <FormControl>
            <Slider
              value={[field.value as number]}
              onValueChange={(value) => field.onChange(value[0])}
              min={1}
              max={10}
              step={1}
              className="py-2"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <PageHeader
          title="Student Feedback"
          description="Provide feedback for allocated students"
          action={
            <Button onClick={handleCreate}>
              <Send className="h-4 w-4 mr-2" />
              New Feedback
            </Button>
          }
        />

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingFeedback ? "Edit Feedback" : "Submit Student Feedback"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                          {allocatedStudents.map((student) => (
                            <SelectItem key={student.id} value={student.id}>
                              {student.name} - {student.studentId}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4">
                  <h4 className="font-medium text-sm">Performance Ratings</h4>
                  <ScoreSlider name="performanceRating" label="Overall Performance" />
                  <ScoreSlider name="attendanceRating" label="Attendance & Punctuality" />
                  <ScoreSlider name="professionalismRating" label="Professionalism" />
                  <ScoreSlider name="technicalSkillsRating" label="Technical Skills" />
                  <ScoreSlider name="communicationRating" label="Communication" />
                </div>

                <FormField
                  control={form.control}
                  name="recommendation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recommendation</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select recommendation" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {recommendations.map((rec) => (
                            <SelectItem key={rec.value} value={rec.value}>
                              {rec.label}
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
                  name="remarks"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Detailed Remarks</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Provide detailed feedback about the student's performance, strengths, and areas for improvement..."
                          className="min-h-[120px]"
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
                    {editingFeedback ? "Update Feedback" : "Submit Feedback"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Submitted Feedback
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Overall Score</TableHead>
                  <TableHead>Recommendation</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockFeedback.map((feedback) => (
                  <TableRow key={feedback.id}>
                    <TableCell className="font-medium">{feedback.studentName}</TableCell>
                    <TableCell>
                      <Badge variant={feedback.overallScore >= 8 ? 'default' : feedback.overallScore >= 6 ? 'secondary' : 'destructive'}>
                        {feedback.overallScore}/10
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground capitalize">
                      {feedback.recommendation.replace('_', ' ')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={feedback.status === 'submitted' ? 'default' : 'outline'}>
                        {feedback.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {feedback.submittedDate || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleEdit(feedback)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
