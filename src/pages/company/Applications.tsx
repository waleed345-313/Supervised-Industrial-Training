import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { mockApplications, mockStudents, mockInternships } from '@/data/mockData';
import { FileText, Eye, CheckCircle, XCircle, User, GraduationCap, Calendar, MapPin } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Application } from '@/types';

export default function CompanyApplications() {
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const { toast } = useToast();

  const handleViewApplication = (application: Application) => {
    setSelectedApplication(application);
    setViewDialogOpen(true);
  };

  const handleAcceptApplication = (application: Application) => {
    // In a real app, this would update the application status via API
    application.status = 'shortlisted';
    toast({
      title: "Application Accepted",
      description: `Application from ${mockStudents.find(s => s.id === application.studentId)?.name} has been accepted.`,
    });
  };

  const handleRejectApplication = (application: Application) => {
    // In a real app, this would update the application status via API
    application.status = 'rejected';
    toast({
      title: "Application Rejected",
      description: `Application from ${mockStudents.find(s => s.id === application.studentId)?.name} has been rejected.`,
    });
  };
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <PageHeader
          title="Applications"
          description="Review student applications"
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Received Applications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Applied Date</TableHead>
                  <TableHead>CGPA</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockApplications.map((application) => {
                  const student = mockStudents.find(s => s.id === application.studentId);
                  const internship = mockInternships.find(i => i.id === application.internshipId);
                  return (
                    <TableRow key={application.id}>
                      <TableCell className="font-medium">{student?.name}</TableCell>
                      <TableCell className="text-muted-foreground">{internship?.title}</TableCell>
                      <TableCell className="text-muted-foreground">{application.appliedDate}</TableCell>
                      <TableCell className="text-muted-foreground">{student?.cgpa}</TableCell>
                      <TableCell>
                        <StatusBadge status={application.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleViewApplication(application)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {application.status === 'pending' && (
                            <>
                              <Button size="sm" variant="default" onClick={() => handleAcceptApplication(application)}>
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleRejectApplication(application)}>
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* View Application Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Application Details</DialogTitle>
              <DialogDescription>
                Review the student's application information
              </DialogDescription>
            </DialogHeader>
            {selectedApplication && (() => {
              const student = mockStudents.find(s => s.id === selectedApplication.studentId);
              const internship = mockInternships.find(i => i.id === selectedApplication.internshipId);
              return (
                <div className="space-y-6">
                  {/* Student Information */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Student Information</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{student?.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">CGPA: {student?.cgpa}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Specialization: {student?.specialization}</span>
                    </div>
                  </div>

                  {/* Internship Information */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Position Applied For</h4>
                    <div className="space-y-2">
                      <h5 className="font-medium">{internship?.title}</h5>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Applied on: {selectedApplication.appliedDate}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>Location: {internship?.location}</span>
                      </div>
                    </div>
                  </div>

                  {/* Application Status */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Application Status</h4>
                    <StatusBadge status={selectedApplication.status} />
                  </div>

                  {/* Internship Requirements */}
                  {internship && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Position Requirements</h4>
                      <ul className="text-sm space-y-1">
                        {internship.requirements.map((req, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-muted-foreground">•</span>
                            <span>{req}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
