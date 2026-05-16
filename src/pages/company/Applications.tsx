import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { FileText, Eye, CheckCircle, XCircle, User, GraduationCap, Calendar, MapPin, Download } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Application } from '@/types';
import api, { API_BASE } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { io, type Socket } from 'socket.io-client';

export default function CompanyApplications() {
  const { user } = useAuth();
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [applicationDocuments, setApplicationDocuments] = useState<any[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const handleViewApplication = async (application: Application) => {
    setSelectedApplication(application);
    setViewDialogOpen(true);
    // Fetch documents for this application
    try {
      const docs = await api.getApplicationDocuments(application.id);
      setApplicationDocuments(docs || []);
    } catch (err) {
      console.error('Failed to load application documents:', err);
      setApplicationDocuments([]);
    }
  };

  const handleDownloadCV = async (doc: any) => {
    try {
      const blob = await api.fetchDocumentBlob(doc._id || doc.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.originalFileName || doc.name || 'resume.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      toast({
        title: 'Download failed',
        description: 'Could not download the CV.',
        variant: 'destructive',
      });
    }
  };

  const loadApplications = useCallback(async () => {
    if (!user?.companyId) {
      setApplications([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await api.getApplicationsForMyCompany();
      setApplications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      toast({
        title: 'Could not load applications',
        description: 'Ensure you are logged in with a company-linked focal account.',
        variant: 'destructive',
      });
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, [toast, user?.companyId]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  useEffect(() => {
    const token = localStorage.getItem('sit_portal_token');
    if (!token || !user?.companyId) return;
    const socket: Socket = io(API_BASE, { auth: { token } });
    const onCompany = (payload: { type?: string }) => {
      if (payload?.type === 'applications') loadApplications();
    };
    socket.on('company:update', onCompany);
    return () => {
      socket.off('company:update', onCompany);
      socket.disconnect();
    };
  }, [user?.companyId, loadApplications]);

  const handleAcceptApplication = async (application: Application) => {
    try {
      await api.updateApplication(application.id, { status: 'shortlisted' });
      toast({
        title: 'Application shortlisted',
        description: `${application.studentName} has been shortlisted.`,
      });
      await loadApplications();
    } catch (err) {
      console.error(err);
      toast({ title: 'Update failed', variant: 'destructive' });
    }
  };

  const handleRejectApplication = async (application: Application) => {
    try {
      await api.updateApplication(application.id, { status: 'rejected' });
      toast({
        title: 'Application rejected',
        description: `${application.studentName}'s application was rejected.`,
      });
      await loadApplications();
    } catch (err) {
      console.error(err);
      toast({ title: 'Update failed', variant: 'destructive' });
    }
  };

  const sortedApplications = useMemo(() => {
    const toCgpa = (value?: string) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : -1;
    };

    return [...applications].sort((a, b) => {
      const cgpaDiff = toCgpa(b.studentCGPA) - toCgpa(a.studentCGPA);
      if (cgpaDiff !== 0) return cgpaDiff;
      return String(a.studentName || '').localeCompare(String(b.studentName || ''));
    });
  }, [applications]);

  const singleCvDocument = useMemo(() => {
    if (!Array.isArray(applicationDocuments) || applicationDocuments.length === 0) return null;

    const resumeLikeDocs = applicationDocuments.filter((doc) => {
      const type = String(doc?.type || '').toLowerCase();
      const name = String(doc?.originalFileName || doc?.name || '').toLowerCase();
      return type === 'resume' || name.includes('cv') || name.includes('resume');
    });

    const candidates = resumeLikeDocs.length > 0 ? resumeLikeDocs : applicationDocuments;
    const sorted = [...candidates].sort((a, b) => {
      const ad = String(a?.uploadedDate || a?.createdAt || '');
      const bd = String(b?.uploadedDate || b?.createdAt || '');
      return bd.localeCompare(ad);
    });
    return sorted[0] || null;
  }, [applicationDocuments]);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <PageHeader
          title="Applications"
          description="Review applications for your company's internships only"
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Received Applications
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!user?.companyId ? (
              <p className="text-sm text-muted-foreground">
                Your account is not linked to a registered company. Contact the administrator.
              </p>
            ) : loading ? (
              <p className="text-sm text-muted-foreground">Loading applications…</p>
            ) : applications.length === 0 ? (
              <p className="text-sm text-muted-foreground">No applications for your company yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Applied Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedApplications.map((application) => (
                    <TableRow key={application.id}>
                      <TableCell className="font-medium">
                        <div className="flex flex-wrap items-center gap-2">
                          <span>{application.studentName}</span>
                          {application.isReplacement && (
                            <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-200">
                              Replacement applicant
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{application.internshipTitle}</TableCell>
                      <TableCell className="text-muted-foreground">{application.appliedDate}</TableCell>
                      <TableCell>
                        <StatusBadge status={application.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleViewApplication(application)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {application.status === 'pending' && (
                            <Button size="sm" variant="default" onClick={() => handleAcceptApplication(application)}>
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          {(application.status === 'pending' || application.status === 'shortlisted') && (
                            <Button size="sm" variant="outline" onClick={() => handleRejectApplication(application)}>
                              <XCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Application Details</DialogTitle>
              <DialogDescription>Review the student&apos;s application for your company</DialogDescription>
            </DialogHeader>
            {selectedApplication && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Student</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{selectedApplication.studentName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">ID: {selectedApplication.studentId}</span>
                    </div>
                    {selectedApplication.studentCGPA && (
                      <div className="flex items-center gap-2">
                        <span className="h-4 w-4 flex items-center justify-center text-muted-foreground font-bold text-xs">CG</span>
                        <span className="text-sm">CGPA: {selectedApplication.studentCGPA}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Position</h4>
                  <div className="space-y-2">
                    <h5 className="font-medium">{selectedApplication.internshipTitle}</h5>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Applied on: {selectedApplication.appliedDate}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{selectedApplication.companyName}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Status</h4>
                  <StatusBadge status={selectedApplication.status} />
                </div>

                {/* CV/Resume Section */}
                {singleCvDocument ? (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Documents</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {singleCvDocument.originalFileName || singleCvDocument.name || 'Resume'}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => api.openDocumentInNewTab(singleCvDocument._id || singleCvDocument.id)}>
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleDownloadCV(singleCvDocument)}>
                            <Download className="h-4 w-4 mr-1" />
                            Download CV
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Documents</h4>
                    <p className="text-sm text-muted-foreground">No resume uploaded by student.</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
