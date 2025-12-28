import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { mockStudents, mockCompanies } from '@/data/mockData';
import { MessageSquare, Send, Eye, User, Calendar, FileText } from 'lucide-react';
import { useState } from 'react';

export default function SupervisorFeedback() {
  const [selectedStudent, setSelectedStudent] = useState<typeof mockStudents[0] | null>(null);
  const [selectedFeedback, setSelectedFeedback] = useState<typeof feedbackHistory[0] | null>(null);
  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({
    type: '',
    message: ''
  });

  const assignedStudents = mockStudents.filter(s => s.currentStatus === 'allocated');

  const feedbackHistory = [
    { 
      id: 1, 
      student: 'Sarah Johnson', 
      date: '2024-01-12', 
      type: 'Monthly Review', 
      status: 'Sent',
      message: 'Excellent progress on the assigned tasks. Keep up the good work and continue to demonstrate strong problem-solving skills.'
    },
    { 
      id: 2, 
      student: 'Michael Chen', 
      date: '2024-01-10', 
      type: 'Performance Note', 
      status: 'Sent',
      message: 'Good documentation and communication skills. Consider improving time management for better productivity.'
    },
    { 
      id: 3, 
      student: 'Sarah Johnson', 
      date: '2024-01-05', 
      type: 'Progress Update', 
      status: 'Sent',
      message: 'Initial onboarding completed successfully. Ready to start working on main project modules.'
    },
  ];

  const handleSendFeedback = () => {
    // In a real app, this would send the feedback via API
    console.log('Sending feedback to:', selectedStudent?.name, feedbackForm);
    setIsSendDialogOpen(false);
    setFeedbackForm({ type: '', message: '' });
    setSelectedStudent(null);
  };

  const handleViewFeedback = (feedback: typeof feedbackHistory[0]) => {
    setSelectedFeedback(feedback);
    setIsViewDialogOpen(true);
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
                {assignedStudents.map((student) => {
                  const company = mockCompanies.find(c => c.name === student.allocatedCompany);
                  return (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell className="text-muted-foreground">{company?.name || 'N/A'}</TableCell>
                      <TableCell className="text-muted-foreground">2024-01-12</TableCell>
                      <TableCell>
                        <Dialog open={isSendDialogOpen} onOpenChange={setIsSendDialogOpen}>
                          <DialogTrigger asChild>
                            <Button size="sm" onClick={() => setSelectedStudent(student)}>
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
                                    Student ID: {selectedStudent.studentId} | Company: {selectedStudent.allocatedCompany}
                                  </div>
                                </div>

                                {/* Feedback Form */}
                                <div className="space-y-4">
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
                                    disabled={!feedbackForm.type || !feedbackForm.message.trim()}
                                    className="flex-1"
                                  >
                                    <Send className="h-4 w-4 mr-2" />
                                    Send Feedback
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    onClick={() => {
                                      setIsSendDialogOpen(false);
                                      setFeedbackForm({ type: '', message: '' });
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
                })}
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
                {feedbackHistory.map((feedback) => (
                  <TableRow key={feedback.id}>
                    <TableCell className="font-medium">{feedback.student}</TableCell>
                    <TableCell className="text-muted-foreground">{feedback.date}</TableCell>
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
                                    <p className="text-sm text-muted-foreground">{selectedFeedback.student}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  <div>
                                    <span className="text-sm font-medium">Date</span>
                                    <p className="text-sm text-muted-foreground">{selectedFeedback.date}</p>
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
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
