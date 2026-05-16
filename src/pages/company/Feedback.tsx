import { useState, useEffect, useCallback } from "react";
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
import { MessageSquare, Send, Eye, Pencil, Loader2 } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Student } from '@/types';
import api, { API_BASE, getCompanyFeedbackForCompany, submitCompanyFeedback } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { io, type Socket } from 'socket.io-client';

const feedbackSchema = z.object({
  studentId: z.string().min(1, "Please select a student"),
  performanceRating: z.number().min(1).max(10),
  attendanceRating: z.number().min(1).max(10),
  professionalismRating: z.number().min(1).max(10),
  technicalSkillsRating: z.number().min(1).max(10),
  communicationRating: z.number().min(1).max(10),
  remarks: z.string().max(500, "Remarks must be less than 500 characters").optional(),
  recommendation: z.string().min(1, "Please select a recommendation"),
});

type FeedbackFormData = z.infer<typeof feedbackSchema>;

const recommendations = [
  { value: 'highly_recommend', label: 'Highly Recommend for Hiring' },
  { value: 'recommend', label: 'Recommend' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'not_recommend', label: 'Do Not Recommend' },
];

interface FeedbackItem {
  id: string;
  studentId: string;
  studentName: string;
  overallScore: number;
  status: 'submitted' | 'draft';
  submittedDate: string | null;
  recommendation: string;
  remarks?: string;
  performanceRating: number;
  attendanceRating: number;
  professionalismRating: number;
  technicalSkillsRating: number;
  communicationRating: number;
}

function mapCompanyFeedbackApi(row: Record<string, unknown>): FeedbackItem | null {
  if (!row?.id || !row.studentId) return null;
  return {
    id: String(row.id),
    studentId: String(row.studentId),
    studentName: String(row.studentName ?? ''),
    overallScore: Number(row.overallScore),
    status: 'submitted',
    submittedDate:
      row.submittedDate != null && row.submittedDate !== ''
        ? String(row.submittedDate)
        : null,
    recommendation: String(row.recommendation ?? 'neutral'),
    remarks: typeof row.remarks === 'string' ? row.remarks : '',
    performanceRating: Number(row.performanceRating),
    attendanceRating: Number(row.attendanceRating),
    professionalismRating: Number(row.professionalismRating),
    technicalSkillsRating: Number(row.technicalSkillsRating),
    communicationRating: Number(row.communicationRating),
  };
}

export default function CompanyFeedback() {
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFeedback, setEditingFeedback] = useState<FeedbackItem | null>(null);
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
  const [allocatedStudents, setAllocatedStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

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
      recommendation: '',
    },
  });

  // Load real data
  const loadData = useCallback(async () => {
    if (!user?.companyId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const [studentsData, feedbackRaw] = await Promise.all([
        api.getStudentsForMyCompany(),
        getCompanyFeedbackForCompany().catch(() => []),
      ]);
      const allocated = (studentsData || []).filter((s: Student) => s.currentStatus === 'allocated');
      setAllocatedStudents(allocated);

      const rows = Array.isArray(feedbackRaw) ? feedbackRaw : [];
      const mapped = rows
        .map((row) => mapCompanyFeedbackApi(row as Record<string, unknown>))
        .filter((x): x is FeedbackItem => x !== null);
      setFeedbackList(mapped);
    } catch (e) {
      console.error(e);
      toast({
        title: 'Could not load students',
        description: 'Check that you are logged in as a company focal.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast, user?.companyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time updates via socket
  useEffect(() => {
    const token = localStorage.getItem('sit_portal_token');
    if (!token || !user?.companyId) return;
    
    const socket: Socket = io(API_BASE, { auth: { token } });
    
    const onCompanyUpdate = (payload: { type?: string }) => {
      if (payload?.type === 'students' || payload?.type === 'allocations') {
        loadData();
      }
    };
    
    socket.on('company:update', onCompanyUpdate);
    
    return () => {
      socket.off('company:update', onCompanyUpdate);
      socket.disconnect();
    };
  }, [user?.companyId, loadData]);

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

  const handleEdit = (feedback: FeedbackItem) => {
    setEditingFeedback(feedback);
    form.reset({
      studentId: feedback.studentId,
      performanceRating: feedback.performanceRating,
      attendanceRating: feedback.attendanceRating,
      professionalismRating: feedback.professionalismRating,
      technicalSkillsRating: feedback.technicalSkillsRating,
      communicationRating: feedback.communicationRating,
      remarks: feedback.remarks || '',
      recommendation: feedback.recommendation,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: FeedbackFormData) => {
    try {
      const avgScore =
        (data.performanceRating +
          data.attendanceRating +
          data.professionalismRating +
          data.technicalSkillsRating +
          data.communicationRating) /
        5;

      await submitCompanyFeedback({
        studentId: data.studentId,
        performanceRating: data.performanceRating,
        attendanceRating: data.attendanceRating,
        professionalismRating: data.professionalismRating,
        technicalSkillsRating: data.technicalSkillsRating,
        communicationRating: data.communicationRating,
        remarks: data.remarks || '',
        recommendation: data.recommendation,
      });

      await loadData();

      toast({
        title: editingFeedback ? 'Feedback Updated' : 'Feedback Submitted',
        description: `Overall score: ${avgScore.toFixed(1)}/10`,
      });

      setIsDialogOpen(false);
      setEditingFeedback(null);
      form.reset();
    } catch (err) {
      console.error(err);
      toast({
        title: editingFeedback ? 'Update failed' : 'Submission failed',
        description: err instanceof Error ? err.message.slice(0, 200) : 'Please try again.',
        variant: 'destructive',
      });
    }
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
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving…
                      </>
                    ) : editingFeedback ? (
                      'Update Feedback'
                    ) : (
                      'Submit Feedback'
                    )}
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
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading…</span>
              </div>
            ) : (
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
                  {feedbackList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No feedback submitted yet. Feedback is optional.
                      </TableCell>
                    </TableRow>
                  ) : (
                    feedbackList.map((feedback) => (
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
                ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
