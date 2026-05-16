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
import api, { getReplacementEligibilityMe } from '@/lib/api';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ReplacementStudentCallout } from '@/components/shared/ReplacementStudentCallout';
import { useSocket } from '@/hooks/use-socket';
import { Student, Application } from '@/types';
import { FileText, Eye, Calendar, Building, Briefcase, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function StudentApplications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const socket = useSocket();
  const student = user as Student;
  const [isLoading, setIsLoading] = useState(true);
  const [applications, setApplications] = useState<Application[]>([]);
  const [replacementEligible, setReplacementEligible] = useState<boolean | null>(null);
  const [eligibilityLoading, setEligibilityLoading] = useState(true);

  const applicationCount = applications.length;
  const maxApplications = student?.maxApplications ?? 2;
  const myApplications = applications;
  const applicationProgress =
    maxApplications > 0 ? Math.min(100, (applicationCount / maxApplications) * 100) : 0;

  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        setIsLoading(true);
        const data = await api.getStudentApplications();
        setApplications(data);
      } catch (error) {
        console.error('Error fetching applications:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchApplications();
  }, []);

  useEffect(() => {
    const loadEligibility = async () => {
      try {
        setEligibilityLoading(true);
        const r = await getReplacementEligibilityMe();
        setReplacementEligible(Boolean(r?.eligible));
      } catch {
        setReplacementEligible(null);
      } finally {
        setEligibilityLoading(false);
      }
    };
    loadEligibility();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const onStudent = (payload: { type?: string }) => {
      if (payload?.type === 'application') {
        void api
          .getStudentApplications()
          .then(setApplications)
          .catch(() => {});
        void getReplacementEligibilityMe()
          .then((r) => setReplacementEligible(Boolean(r?.eligible)))
          .catch(() => setReplacementEligible(null));
      }
    };
    socket.on('student:update', onStudent);
    return () => {
      socket.off('student:update', onStudent);
    };
  }, [socket]);

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

        <ReplacementStudentCallout eligible={replacementEligible} loading={isLoading || eligibilityLoading} />

        {/* Application Limit Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="font-medium mb-1">Application Limit</h3>
                <p className="text-sm text-muted-foreground">
                  You have used {applicationCount} of {maxApplications} applications
                </p>
              </div>
              <div className="w-full sm:w-48">
                <Progress value={applicationProgress} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1 text-right">
                  {Math.max(0, maxApplications - applicationCount)} remaining
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
                      <TableCell className="font-medium">
                        <div>{application.internshipTitle}</div>
                        {application.isReplacement && (
                          <Badge variant="outline" className="mt-1 border-amber-500/50 text-xs text-amber-800 dark:text-amber-200">
                            Replacement
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{application.companyName}</TableCell>
                      <TableCell className="text-muted-foreground">{application.appliedDate}</TableCell>
                      <TableCell>
                        <StatusBadge status={application.status} isReplacement={application.isReplacement} />
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
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
                <span className="text-sm text-muted-foreground">Not selected (standard applications)</span>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status="replaced" />
                <span className="text-sm text-muted-foreground">Replacement route — employer did not take the offer</span>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status="exhaust" />
                <span className="text-sm text-muted-foreground">No seats available</span>
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
                  <StatusBadge status={selectedApplication.status} isReplacement={selectedApplication.isReplacement} />
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
                  {selectedApplication.status === 'rejected' && selectedApplication.isReplacement && (
                    <p className="text-sm text-muted-foreground">
                      This replacement application was not taken by the employer. Your placement office may route you to another
                      company when you are eligible.
                    </p>
                  )}
                  {selectedApplication.status === 'rejected' && !selectedApplication.isReplacement && (
                    <p className="text-sm text-muted-foreground">
                      Unfortunately, your application was not successful this time. You can apply for other available positions.
                    </p>
                  )}
                  {selectedApplication.status === 'exhaust' && (
                    <p className="text-sm text-muted-foreground">
                      This internship no longer has open seats for new allocations. Your application slot has been returned so you may apply elsewhere if you are eligible.
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
