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
  getFocalDocuments,
  openDocumentInNewTab,
  downloadDocumentFile,
} from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { io, type Socket } from 'socket.io-client';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type DocCategory = 'all' | 'attendance' | 'acceptance' | 'completion';

function docCategory(doc: Document): DocCategory {
  if (doc.type === 'attendance_sheet') return 'attendance';
  if (doc.type === 'acceptance_letter') return 'acceptance';
  if (doc.type === 'completion_sit_1' || doc.type === 'completion_sit_2' || doc.type === 'completion_letter') {
    return 'completion';
  }
  return 'all';
}

export default function FocalDocuments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const docs = await getFocalDocuments();
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
    socket.on('focal:update', onUpdate);
    return () => {
      socket.off('focal:update', onUpdate);
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

  // Show all document types
  const relevantDocuments = documents;

  const attendanceDocs = relevantDocuments.filter((d) => docCategory(d) === 'attendance');
  const acceptanceDocs = relevantDocuments.filter((d) => docCategory(d) === 'acceptance');
  const completionDocs = relevantDocuments.filter((d) => docCategory(d) === 'completion');

  const renderTable = (rows: Document[]) => (
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
        {rows.map((doc) => (
          <TableRow key={doc.id}>
            <TableCell className="font-medium">{doc.name}</TableCell>
            <TableCell>
              <Badge variant={doc.type === 'attendance_sheet' ? 'default' : 'secondary'}>
                {doc.type.replace(/_/g, ' ')}
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
        {rows.length === 0 && (
          <TableRow>
            <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
              No documents in this category yet.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <PageHeader
          title="Documents"
          description="View and download attendance sheets, acceptance letters, and completion letters (SIT 1 / SIT 2)."
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
              <Tabs defaultValue="all">
                <TabsList className="mb-4 flex flex-wrap justify-start gap-1">
                  <TabsTrigger value="all">
                    All
                    <Badge variant="secondary" className="ml-2">
                      {relevantDocuments.length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="attendance">
                    Attendance sheets
                    <Badge variant="secondary" className="ml-2">
                      {attendanceDocs.length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="acceptance">
                    Acceptance letters
                    <Badge variant="secondary" className="ml-2">
                      {acceptanceDocs.length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="completion">
                    Completion letters
                    <Badge variant="secondary" className="ml-2">
                      {completionDocs.length}
                    </Badge>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="all">
                  {renderTable(relevantDocuments)}
                  {relevantDocuments.length === 0 && (
                    <div className="pt-4 text-sm text-muted-foreground">
                      Documents will appear here when companies upload attendance sheets, acceptance letters, or completion letters.
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="attendance">{renderTable(attendanceDocs)}</TabsContent>
                <TabsContent value="acceptance">{renderTable(acceptanceDocs)}</TabsContent>
                <TabsContent value="completion">{renderTable(completionDocs)}</TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
