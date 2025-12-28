import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { mockApplications } from '@/data/mockData';
import { useAuth } from '@/contexts/AuthContext';
import { Student, Application } from '@/types';
import { FileText, Eye, Calendar, Building, Briefcase, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

export default function StudentApplications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const student = user as Student;
  
  const myApplications = mockApplications.filter(a => a.studentId === student.id);
  const applicationProgress = (student.applicationCount / student.maxApplications) * 100;

  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);

  const handleViewApplication = (application: Application) => {
    setSelectedApplication(application);
    setViewDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="My Applications"
          description="Track and manage your internship applications"
        />

        {/* Application Limit Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="font-medium mb-1">Application Limit</h3>
                <p className="text-sm text-muted-foreground">
                  You have used {student.applicationCount} of {student.maxApplications} applications
                </p>
              </div>
              <div className="w-full sm:w-48">
                <Progress value={applicationProgress} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1 text-right">
                  {student.maxApplications - student.applicationCount} remaining
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Applications Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Application History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {myApplications.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Internship</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Applied Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myApplications.map((application) => (
                    <TableRow key={application.id}>
                      <TableCell className="font-medium">{application.internshipTitle}</TableCell>
                      <TableCell className="text-muted-foreground">{application.companyName}</TableCell>
                      <TableCell className="text-muted-foreground">{application.appliedDate}</TableCell>
                      <TableCell>
                        <StatusBadge status={application.status} />
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => handleViewApplication(application)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="py-12 text-center">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">No applications yet</h3>
                <p className="text-muted-foreground mb-4">Start browsing internships to submit your applications</p>
                <Button onClick={() => navigate('/student/internships')}>Browse Internships</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Legend */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-medium mb-4">Status Guide</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <StatusBadge status="pending" />
                <span className="text-sm text-muted-foreground">Under review</span>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status="shortlisted" />
                <span className="text-sm text-muted-foreground">Selected for interview</span>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status="allocated" />
                <span className="text-sm text-muted-foreground">Position confirmed</span>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status="rejected" />
                <span className="text-sm text-muted-foreground">Not selected</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Application Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Application Details</DialogTitle>
            <DialogDescription>
              Review your internship application information
            </DialogDescription>
          </DialogHeader>
          {selectedApplication && (
            <div className="space-y-6">
              {/* Application Status */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Application Status</h4>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h5 className="font-medium">Current Status</h5>
                    <p className="text-sm text-muted-foreground">Your application progress</p>
                  </div>
                  <StatusBadge status={selectedApplication.status} />
                </div>
              </div>

              {/* Internship Details */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Internship Details</h4>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Briefcase className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <h5 className="font-medium">{selectedApplication.internshipTitle}</h5>
                      <p className="text-sm text-muted-foreground">Position Title</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Building className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <h5 className="font-medium">{selectedApplication.companyName}</h5>
                      <p className="text-sm text-muted-foreground">Company</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <h5 className="font-medium">{selectedApplication.appliedDate}</h5>
                      <p className="text-sm text-muted-foreground">Application Date</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Remarks */}
              {selectedApplication.remarks && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Remarks</h4>
                  <div className="flex items-start gap-3">
                    <MessageSquare className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">{selectedApplication.remarks}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Status Information */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Status Information</h4>
                <div className="p-4 bg-muted/50 rounded-lg">
                  {selectedApplication.status === 'pending' && (
                    <p className="text-sm text-muted-foreground">
                      Your application is currently under review by the company. You will be notified once a decision is made.
                    </p>
                  )}
                  {selectedApplication.status === 'shortlisted' && (
                    <p className="text-sm text-muted-foreground">
                      Congratulations! You have been shortlisted for this position. The company may contact you for an interview.
                    </p>
                  )}
                  {selectedApplication.status === 'allocated' && (
                    <p className="text-sm text-muted-foreground">
                      Excellent! You have been allocated this internship position. Please check your email for further instructions.
                    </p>
                  )}
                  {selectedApplication.status === 'rejected' && (
                    <p className="text-sm text-muted-foreground">
                      Unfortunately, your application was not successful this time. You can apply for other available positions.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
