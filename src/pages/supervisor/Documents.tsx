import { useCallback, useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { FileText, Download, Eye, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { Document } from '@/types';
import {
  API_BASE,
  getSupervisorDocuments,
  openDocumentInNewTab,
  downloadDocumentFile,
} from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { io, type Socket } from 'socket.io-client';
import { Badge } from '@/components/ui/badge';

export default function SupervisorDocuments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const docs = await getSupervisorDocuments();
      setDocuments(Array.isArray(docs) ? docs : []);
    } catch (e) {
      console.error(e);
      // Silently fail - show empty state instead of error toast
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const token = localStorage.getItem('sit_portal_token');
    if (!token) return;
    const socket: Socket = io(API_BASE, { auth: { token } });
    const onUpdate = (payload: { type?: string }) => {
      if (payload?.type === 'documents') loadData();
    };
    socket.on('supervisor:update', onUpdate);
    return () => {
      socket.off('supervisor:update', onUpdate);
      socket.disconnect();
    };
  }, [loadData]);

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

  // Filter for attendance sheets only (uploaded by industrial supervisor)
  const relevantDocuments = documents.filter(
    (d) => d.type === 'attendance_sheet'
  );

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <PageHeader
          title="Documents"
          description="View and download student attendance sheets uploaded by industrial supervisors."
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Student Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading…
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {relevantDocuments.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.name}</TableCell>
                      <TableCell>
                        <Badge variant={doc.type === 'attendance_sheet' ? 'default' : 'secondary'}>
                          {doc.type.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{doc.studentName ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{doc.internshipTitle ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{doc.companyName ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{doc.uploadedDate}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" type="button" onClick={() => handleView(doc)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" type="button" onClick={() => handleDownload(doc)}>
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {relevantDocuments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No documents available yet. Documents will appear here when industrial supervisors upload attendance sheets for your assigned students.
                      </TableCell>
                    </TableRow>
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
