import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRealtimeData, useRealtimeFeedback, useRealtimeSupervisorStudents } from '@/hooks/use-realtime-data';
import { getSupervisorMonthlyEvaluations, sendFeedback } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Send, Eye, User, Calendar, FileText } from 'lucide-react';
import { useMemo, useState } from 'react';

interface Student {
  id: string;
  name: string;
  email: string;
  studentId: string;
  allocatedCompany?: string;
}

interface FeedbackItem {
  _id: string;
  studentUser: string;
  studentName: string;
  month?: string;
  type: string;
  message: string;
  status: string;
  sentAt: string;
}

interface MonthlyEvaluation {
  id: string;
  studentId: string;
  studentName: string;
  month: string;
  marksOutOf12_5: number;
  remarks: string;
  date: string;
}

export default function SupervisorFeedback() {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({
    type: '',
    month: '',
    message: ''
  });
  const { toast } = useToast();

  const { data: students = [], loading: studentsLoading } = useRealtimeSupervisorStudents();
  const { data: feedbackHistory = [], loading: feedbackLoading, refresh } = useRealtimeFeedback();

  const { data: monthlyEvals = [] } = useRealtimeData({
    fetchFn: async () => getSupervisorMonthlyEvaluations(),
    socketEvent: 'supervisor:update',
    updateTypes: ['evaluations'],
    initialData: [],
    pollingInterval: 30000,
  });

  const monthlyByStudent = useMemo(() => {
    const map = new Map<string, MonthlyEvaluation[]>();
    for (const e of monthlyEvals as MonthlyEvaluation[]) {
      const sid = String(e.studentId || '');
      if (!sid) continue;
      const list = map.get(sid) || [];
      list.push(e);
      map.set(sid, list);
    }
    for (const [sid, list] of map.entries()) {
      list.sort((a, b) => String(a.month || '').localeCompare(String(b.month || '')));
      map.set(sid, list);
    }
    return map;
  }, [monthlyEvals]);

  const handleSendFeedback = async () => {
    if (!selectedStudent) return;
    
    // If no feedback provided, just close (optional feedback)
    if (!feedbackForm.type && !feedbackForm.message.trim()) {
      setIsSendDialogOpen(false);
      setSelectedStudent(null);
      return;
    }

    if (!feedbackForm.type || !feedbackForm.message.trim()) {
      toast({
        title: 'Missing fields',
        description: 'Select a feedback type and enter a message (or leave both empty to skip).',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      await sendFeedback({
        studentId: selectedStudent.id,
        type: feedbackForm.type,
        month: feedbackForm.month || undefined,
        message: feedbackForm.message,
      });
      
      toast({
        title: "Feedback Sent",
        description: `Feedback sent to ${selectedStudent.name}.`,
      });
      
      refresh();
      setIsSendDialogOpen(false);
      setFeedbackForm({ type: '', month: '', message: '' });
      setSelectedStudent(null);
    } catch (err) {
      console.error('Failed to send feedback:', err);
      toast({
        title: "Failed to Send",
        description: err instanceof Error ? err.message : "Failed to send feedback. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleViewFeedback = (feedback: FeedbackItem) => {
    setSelectedFeedback(feedback);
    setIsViewDialogOpen(true);
  };
  
  const getLastFeedbackDate = (studentId: string) => {
    const studentFeedback = feedbackHistory.filter(f => f.studentUser === studentId);
    if (studentFeedback.length === 0) return 'No feedback yet';
    return new Date(studentFeedback[0].sentAt).toLocaleDateString();
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <PageHeader
          title="Feedback"
          description="Provide feedback to students"
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Send Feedback
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Last Feedback</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentsLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>no students assigned yet.</p>
                    </TableCell>
                  </TableRow>
                ) : students.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>no students assigned yet.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  students.map((student: Student) => {
                    const evals = monthlyByStudent.get(String(student.id)) || [];
                    const canSend = evals.length > 0;
                    return (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell className="text-muted-foreground">{student.allocatedCompany || 'N/A'}</TableCell>
                      <TableCell className="text-muted-foreground">{getLastFeedbackDate(student.id)}</TableCell>
                      <TableCell>
                        <Dialog open={isSendDialogOpen} onOpenChange={setIsSendDialogOpen}>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              disabled={!canSend}
                              onClick={() => {
                                setSelectedStudent(student);
                                const months = Array.from(new Set(evals.map(e => String(e.month || '').trim()).filter(Boolean)));
                                const latest = months.sort((a, b) => a.localeCompare(b)).slice(-1)[0] || '';
                                setFeedbackForm(prev => ({ ...prev, month: latest }));
                              }}
                              title={!canSend ? 'Enabled after industrial supervisor submits monthly marking' : undefined}
                            >
                              <Send className="h-4 w-4 mr-1" />
                              Send Feedback
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                <Send className="h-5 w-5" />
                                Send Feedback
                              </DialogTitle>
                            </DialogHeader>
                            {selectedStudent && (
                              <div className="space-y-6">
                                {/* Student Info */}
                                <div className="p-4 bg-muted/50 rounded-lg">
                                  <div className="flex items-center gap-2 mb-2">
                                    <User className="h-4 w-4" />
                                    <span className="font-medium">{selectedStudent.name}</span>
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    Student ID: {selectedStudent.studentId} | Company: {selectedStudent.allocatedCompany || 'N/A'}
                                  </div>
                                </div>

                                {/* Feedback Form */}
                                <div className="space-y-4">
                                  <div>
                                    <Label htmlFor="feedback-month">Month (optional)</Label>
                                    <Select
                                      value={feedbackForm.month}
                                      onValueChange={(value) => setFeedbackForm(prev => ({ ...prev, month: value }))}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select month (optional)" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {(monthlyByStudent.get(String(selectedStudent.id)) || [])
                                          .map(e => String(e.month || '').trim())
                                          .filter(Boolean)
                                          .filter((v, i, arr) => arr.indexOf(v) === i)
                                          .sort((a, b) => a.localeCompare(b))
                                          .map((m) => (
                                            <SelectItem key={m} value={m}>
                                              {m}
                                            </SelectItem>
                                          ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label htmlFor="feedback-type">Feedback Type</Label>
                                    <Select value={feedbackForm.type} onValueChange={(value) => setFeedbackForm(prev => ({ ...prev, type: value }))}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select feedback type" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="monthly-review">Monthly Review</SelectItem>
                                        <SelectItem value="performance-note">Performance Note</SelectItem>
                                        <SelectItem value="progress-update">Progress Update</SelectItem>
                                        <SelectItem value="improvement-suggestion">Improvement Suggestion</SelectItem>
                                        <SelectItem value="commendation">Commendation</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div>
                                    <Label htmlFor="feedback-message">Message</Label>
                                    <Textarea
                                      id="feedback-message"
                                      placeholder="Write your feedback message here..."
                                      value={feedbackForm.message}
                                      onChange={(e) => setFeedbackForm(prev => ({ ...prev, message: e.target.value }))}
                                      rows={6}
                                    />
                                  </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-3 pt-4 border-t">
                                  <Button 
                                    onClick={handleSendFeedback}
                                    className="flex-1"
                                  >
                                    <Send className="h-4 w-4 mr-2" />
                                    {feedbackForm.type || feedbackForm.message.trim() ? 'Send Feedback' : 'Skip & Continue'}
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    onClick={() => {
                                      setIsSendDialogOpen(false);
                                      setFeedbackForm({ type: '', month: '', message: '' });
                                      setSelectedStudent(null);
                                    }}
                                    className="flex-1"
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  );
                })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Feedback History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feedbackHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      <p>No feedback submitted yet.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  feedbackHistory.map((feedback: FeedbackItem) => (
                  <TableRow key={feedback._id}>
                    <TableCell className="font-medium">{feedback.studentName}</TableCell>
                    <TableCell className="text-muted-foreground">{new Date(feedback.sentAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-muted-foreground">{feedback.type}</TableCell>
                    <TableCell className="text-muted-foreground">{feedback.status}</TableCell>
                    <TableCell>
                      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => handleViewFeedback(feedback)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <FileText className="h-5 w-5" />
                              Feedback Details
                            </DialogTitle>
                          </DialogHeader>
                          {selectedFeedback && (
                            <div className="space-y-6">
                              {/* Feedback Header */}
                              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-muted-foreground" />
                                  <div>
                                    <span className="text-sm font-medium">Student</span>
                                    <p className="text-sm text-muted-foreground">{selectedFeedback.studentName}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  <div>
                                    <span className="text-sm font-medium">Date</span>
                                    <p className="text-sm text-muted-foreground">{new Date(selectedFeedback.sentAt).toLocaleDateString()}</p>
                                  </div>
                                </div>
                                <div>
                                  <span className="text-sm font-medium">Type</span>
                                  <p className="text-sm text-muted-foreground">{selectedFeedback.type}</p>
                                </div>
                                <div>
                                  <span className="text-sm font-medium">Status</span>
                                  <p className="text-sm text-green-600 font-medium">{selectedFeedback.status}</p>
                                </div>
                              </div>

                              {/* Feedback Message */}
                              <div>
                                <h4 className="text-sm font-medium mb-3">Feedback Message</h4>
                                <div className="p-4 border rounded-lg bg-background">
                                  <p className="text-sm leading-relaxed">{selectedFeedback.message}</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
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
