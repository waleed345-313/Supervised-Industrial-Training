import { useCallback, useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Download, Loader2, Eye, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { Document, StudentDocumentApplicationSlot } from '@/types';
import { API_BASE, getStudentDocuments, downloadDocumentFile, openDocumentInNewTab } from '@/lib/api';
import { io, type Socket } from 'socket.io-client';

function typeLabel(type: string) {
  const labels: Record<string, string> = {
    acceptance_letter: 'Acceptance letter',
    completion_letter: 'Completion letter',
    completion_sit_1: 'Completion — SIT 1',
    completion_sit_2: 'Completion — SIT 2',
    attendance_sheet: 'Attendance sheet',
    guideline: 'Guideline',
    report: 'Report',
    resume: 'Resume',
  };
  if (labels[type]) return labels[type];
  return type.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/** Types uploaded by the host company for the student (letters / attendance). */
const COMPANY_LETTER_TYPES = new Set<Document['type']>([
  'acceptance_letter',
  'completion_letter',
  'completion_sit_1',
  'completion_sit_2',
  'attendance_sheet',
]);

function isCompanyLetterDoc(doc: Document) {
  return COMPANY_LETTER_TYPES.has(doc.type);
}

const SLOT_TYPE_LABEL: Record<StudentDocumentApplicationSlot, string> = {
  priority1: 'priority1',
  priority2: 'priority 2',
  replacement: 'replacement',
  shuffle: 'shuffle',
};

function studentUploadTypeBadge(doc: Document) {
  if (doc.applicationSlot && SLOT_TYPE_LABEL[doc.applicationSlot]) {
    return SLOT_TYPE_LABEL[doc.applicationSlot];
  }
  return typeLabel(doc.type);
}

export default function StudentDocuments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (user?.role !== 'student') {
      setDocuments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await getStudentDocuments();
      setDocuments(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      toast({
        title: 'Could not load documents',
        description: 'Sign in as a student to see letters from your company.',
        variant: 'destructive',
      });
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [toast, user?.role]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const token = localStorage.getItem('sit_portal_token');
    if (!token || user?.role !== 'student') return;
    const socket: Socket = io(API_BASE, { auth: { token } });
    const onStudent = (payload: { type?: string }) => {
      if (payload?.type === 'documents') load();
    };
    socket.on('student:update', onStudent);
    return () => {
      socket.off('student:update', onStudent);
      socket.disconnect();
    };
  }, [user?.role, load]);

  const companyLetters = useMemo(() => documents.filter(isCompanyLetterDoc), [documents]);
  const studentUploads = useMemo(() => documents.filter((d) => !isCompanyLetterDoc(d)), [documents]);

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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Documents"
          description="Letters from your host company are listed separately from files you uploaded (CV, reports, guidelines) for your applications."
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Letters from your company
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground py-8">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading…
              </div>
            ) : companyLetters.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6">
                No company-uploaded letters yet. When your company focal uploads acceptance or completion letters
                (SIT 1 / SIT 2) or attendance records for you, they will appear here.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companyLetters.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{typeLabel(doc.type)}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{doc.companyName ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{doc.internshipTitle ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{doc.uploadedDate}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleView(doc)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Open
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDownload(doc)}>
                            <Download className="mr-2 h-4 w-4" />
                            Download
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Your uploads (CV and application files)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground py-8">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading…
              </div>
            ) : studentUploads.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6">
                No résumé or other application files are stored here yet. Upload your CV from Applications or your
                profile flow when applying to internships.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studentUploads.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{studentUploadTypeBadge(doc)}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{doc.companyName ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{doc.internshipTitle ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{doc.uploadedDate}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleView(doc)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Open
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDownload(doc)}>
                            <Download className="mr-2 h-4 w-4" />
                            Download
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
      </div>
    </DashboardLayout>
  );
}
