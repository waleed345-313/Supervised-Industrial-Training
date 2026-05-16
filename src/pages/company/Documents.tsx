import { useCallback, useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { FileText, Upload, Download, Eye, Trash2, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { Application, Document } from '@/types';
import {
  API_BASE,
  getCompanyDocuments,
  getApplicationsForMyCompany,
  uploadCompanyDocument,
  deleteCompanyDocument,
  openDocumentInNewTab,
  downloadDocumentFile,
} from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { io, type Socket } from 'socket.io-client';

type CompletionUploadType = 'completion_sit_1' | 'completion_sit_2';
type UploadDocType = 'acceptance_letter' | CompletionUploadType | 'attendance_sheet';

export default function CompanyDocuments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [documentType, setDocumentType] = useState<UploadDocType>('acceptance_letter');
  const [applicationId, setApplicationId] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);

  const loadData = useCallback(async () => {
    if (!user?.companyId) {
      setDocuments([]);
      setApplications([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [docs, apps] = await Promise.all([getCompanyDocuments(), getApplicationsForMyCompany()]);
      setDocuments(Array.isArray(docs) ? docs : []);
      setApplications(Array.isArray(apps) ? apps : []);
    } catch (e) {
      console.error(e);
      toast({
        title: 'Could not load data',
        description: 'Ensure you are logged in as a company focal with a linked company.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast, user?.companyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const token = localStorage.getItem('sit_portal_token');
    if (!token || !user?.companyId) return;
    const socket: Socket = io(API_BASE, { auth: { token } });
    const onCompany = (payload: { type?: string }) => {
      if (payload?.type === 'documents' || payload?.type === 'applications') loadData();
    };
    socket.on('company:update', onCompany);
    return () => {
      socket.off('company:update', onCompany);
      socket.disconnect();
    };
  }, [user?.companyId, loadData]);

  const shortlisted = applications.filter((a) => a.status === 'shortlisted');
  const allocated = applications.filter((a) => a.status === 'allocated');
  const companyDocs = documents.filter((doc) => doc.type !== 'resume');

  const categorizedDocs: Array<{
    key: 'acceptance_letter' | 'attendance_sheet' | 'completion_sit_1' | 'completion_sit_2';
    title: string;
    docs: Document[];
  }> = [
    {
      key: 'acceptance_letter',
      title: 'Acceptance Letters',
      docs: companyDocs.filter((doc) => doc.type === 'acceptance_letter'),
    },
    {
      key: 'attendance_sheet',
      title: 'Attendance Sheets',
      docs: companyDocs.filter((doc) => doc.type === 'attendance_sheet').slice(0, 1),
    },
    {
      key: 'completion_sit_1',
      title: 'Completion — SIT 1',
      docs: companyDocs.filter((doc) => doc.type === 'completion_sit_1'),
    },
    {
      key: 'completion_sit_2',
      title: 'Completion — SIT 2',
      docs: companyDocs.filter(
        (doc) => doc.type === 'completion_sit_2' || doc.type === 'completion_letter'
      ),
    },
  ];

  const eligibleApplications =
    documentType === 'acceptance_letter' ? shortlisted : allocated;

  useEffect(() => {
    if (!uploadOpen) return;
    if (documentType === 'attendance_sheet') {
      // No application needed for attendance sheets - they apply to all students
      setApplicationId('');
      return;
    }
    const list = documentType === 'acceptance_letter' ? shortlisted : allocated;
    setApplicationId((prev) => (list.some((a) => a.id === prev) ? prev : list[0]?.id || ''));
  }, [documentType, uploadOpen, shortlisted, allocated]);

  const openUpload = () => {
    setDocumentType('acceptance_letter');
    setFile(null);
    setApplicationId(shortlisted[0]?.id || '');
    setUploadOpen(true);
  };

  const handleSubmitUpload = async () => {
    if (!file) {
      toast({ title: 'Choose a file', variant: 'destructive' });
      return;
    }
    // applicationId is required for acceptance/completion letters, optional for attendance sheets
    if (documentType !== 'attendance_sheet' && !applicationId) {
      toast({ title: 'Select a student application', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (applicationId) {
        fd.append('applicationId', applicationId);
      }
      fd.append('documentType', documentType);
      await uploadCompanyDocument(fd);
      let uploadDescription = 'Uploaded successfully.';
      if (documentType === 'acceptance_letter') {
        uploadDescription =
          'Acceptance letter saved. Student is now allocated; seats and other applicants were updated if applicable.';
      } else if (documentType === 'completion_sit_1') {
        uploadDescription =
          'Completion letter (SIT 1) saved. Upload SIT 2 when the remainder of the placement is finished.';
      } else if (documentType === 'completion_sit_2') {
        uploadDescription =
          'Completion letter (SIT 2) saved. Student status updated to completed.';
      } else if (documentType === 'attendance_sheet') {
        uploadDescription = 'Attendance sheet uploaded successfully.';
      }
      toast({
        title: 'Uploaded',
        description: uploadDescription,
      });
      setUploadOpen(false);
      setFile(null);
      await loadData();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Upload failed';
      toast({ title: 'Upload failed', description: msg.slice(0, 200), variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleView = async (doc: Document) => {
    try {
      await openDocumentInNewTab(doc.id);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not open file';
      toast({ title: 'View failed', description: msg.slice(0, 200), variant: 'destructive' });
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      await downloadDocumentFile(doc.id, doc.name);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not download';
      toast({ title: 'Download failed', description: msg.slice(0, 200), variant: 'destructive' });
    }
  };

  const handleDelete = async (doc: Document) => {
    if (!window.confirm(`Delete "${doc.name}"?`)) return;
    try {
      await deleteCompanyDocument(doc.id);
      toast({ title: 'Deleted' });
      await loadData();
    } catch (e) {
      toast({ title: 'Delete failed', variant: 'destructive' });
    }
  };

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <PageHeader
          title="Documents"
          description="Upload acceptance letters, completion letters for SIT 1 / SIT 2, or attendance sheets. Acceptance converts shortlisted applicants to allocated; SIT 2 completion marks the student as completed."
          action={
            <Button onClick={openUpload} disabled={!user.companyId}>
              <Upload className="h-4 w-4 mr-2" />
              Upload letter
            </Button>
          }
        />

        {!user.companyId && (
          <p className="text-sm text-muted-foreground">
            Link your account to a registered company to use document uploads.
          </p>
        )}

        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {documentType === 'attendance_sheet' ? 'Upload attendance sheet' : 'Upload student letter'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Document type</Label>
                <Select
                  value={documentType}
                  onValueChange={(v) => setDocumentType(v as UploadDocType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="acceptance_letter">Acceptance letter (shortlisted → allocated)</SelectItem>
                    <SelectItem value="completion_sit_1">
                      Completion letter — SIT 1 (allocated, first segment)
                    </SelectItem>
                    <SelectItem value="completion_sit_2">
                      Completion letter — SIT 2 (allocated → completed)
                    </SelectItem>
                    <SelectItem value="attendance_sheet">Attendance sheet (for allocated students)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {documentType !== 'attendance_sheet' && (
                <div className="space-y-2">
                  <Label>
                    {documentType === 'acceptance_letter'
                      ? 'Shortlisted application'
                      : 'Allocated application'}
                  </Label>
                  <Select value={applicationId} onValueChange={setApplicationId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select application" />
                    </SelectTrigger>
                    <SelectContent>
                      {eligibleApplications.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.studentName} — {a.internshipTitle}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {eligibleApplications.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No matching applications. Shortlist students from Applications first. For completion letters,
                      the student must be allocated.
                    </p>
                  )}
                </div>
              )}
              {documentType === 'attendance_sheet' && (
                <p className="text-sm text-muted-foreground">
                  This attendance sheet will be available for all allocated students in your company.
                </p>
              )}
              <div className="space-y-2">
                <Label>File</Label>
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setUploadOpen(false)}>
                Cancel
              </Button>
              <Button type="button" disabled={submitting} onClick={handleSubmitUpload}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Upload'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {categorizedDocs.map((section) => (
          <Card key={section.key}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {section.title}
                </span>
                {!loading && (
                  <span className="text-sm font-normal text-muted-foreground">
                    {section.docs.length} file(s)
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading…
                </div>
              ) : section.docs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No {section.title.toLowerCase()} uploaded yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {section.docs.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">{doc.name}</TableCell>
                        <TableCell className="text-muted-foreground">{doc.studentName ?? '—'}</TableCell>
                        <TableCell className="text-muted-foreground">{doc.internshipTitle ?? '—'}</TableCell>
                        <TableCell className="text-muted-foreground">{doc.uploadedDate}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" type="button" onClick={() => handleView(doc)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" type="button" onClick={() => handleDownload(doc)}>
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              type="button"
                              className="text-destructive"
                              onClick={() => handleDelete(doc)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        ))}

        {!loading && companyDocs.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">No documents uploaded yet.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
