import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import api, { API_BASE } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { io, type Socket } from 'socket.io-client';
import { Briefcase, Upload, Send, FileText, Pencil, Loader2 } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { Internship, Document, Student } from '@/types';

export function CompanyFocalDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [internships, setInternships] = useState<Internship[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [allocatedStudents, setAllocatedStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedInternship, setSelectedInternship] = useState<Internship | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    seats: '',
    description: ''
  });

  // Load real data
  const loadData = useCallback(async () => {
    if (!user?.companyId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const [internshipsData, docsData, appsData, studentsData] = await Promise.all([
        api.getInternshipsForMyCompany(),
        api.getCompanyDocuments(),
        api.getApplicationsForMyCompany(),
        api.getStudentsForMyCompany(),
      ]);
      
      setInternships(Array.isArray(internshipsData) ? internshipsData : []);
      setDocuments(Array.isArray(docsData) ? docsData : []);
      setApplications(Array.isArray(appsData) ? appsData : []);
      
      const allocated = (studentsData || []).filter((s: Student) => s.currentStatus === 'allocated');
      setAllocatedStudents(allocated);
    } catch (e) {
      console.error(e);
      toast({
        title: 'Could not load dashboard data',
        description: 'Check that you are logged in as a company focal.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast, user?.companyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time updates via socket
  useEffect(() => {
    const token = localStorage.getItem('sit_portal_token');
    if (!token || !user?.companyId) return;
    
    const socket: Socket = io(API_BASE, { auth: { token } });
    
    const onCompanyUpdate = (payload: { type?: string }) => {
      if (payload?.type === 'internships' || payload?.type === 'applications' || payload?.type === 'students' || payload?.type === 'documents') {
        loadData();
      }
    };
    
    socket.on('company:update', onCompanyUpdate);
    socket.on('application:update', onCompanyUpdate);
    
    return () => {
      socket.disconnect();
    };
  }, [loadData, user?.companyId]);

  const handleEditInternship = (internship: Internship) => {
    setSelectedInternship(internship);
    setEditForm({
      title: internship.title,
      seats: internship.seats.toString(),
      description: internship.description
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    toast({
      title: "Internship Updated",
      description: `${editForm.title} has been updated successfully.`,
    });
    setIsEditDialogOpen(false);
    setSelectedInternship(null);
  };

  const classifyDocumentCategory = (doc: Document): 'Attendance' | 'Completion' | 'Acceptance' | 'CV' | 'Other' => {
    if (doc.type === 'attendance_sheet') return 'Attendance';
    if (doc.type === 'acceptance_letter') return 'Acceptance';
    if (doc.type === 'resume') return 'CV';
    if (doc.type === 'completion_letter' || doc.type === 'completion_sit_1' || doc.type === 'completion_sit_2') {
      return 'Completion';
    }
    return 'Other';
  };

  const documentsByCategory: Array<{
    title: 'Attendance' | 'Completion' | 'Acceptance' | 'CV';
    docs: Document[];
  }> = [
    { title: 'Attendance', docs: documents.filter((d) => classifyDocumentCategory(d) === 'Attendance') },
    { title: 'Completion', docs: documents.filter((d) => classifyDocumentCategory(d) === 'Completion') },
    { title: 'Acceptance', docs: documents.filter((d) => classifyDocumentCategory(d) === 'Acceptance') },
    { title: 'CV', docs: documents.filter((d) => classifyDocumentCategory(d) === 'CV') },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Company Focal Dashboard"
        description="Manage internship postings and documents"
      />

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Postings"
          value={internships.filter(i => i.status === 'open').length}
          description="Open internships"
          icon={<Briefcase className="h-5 w-5" />}
        />
        <StatCard
          title="Total Applications"
          value={applications.length}
          description="Received"
          icon={<FileText className="h-5 w-5" />}
        />
        <StatCard
          title="Documents"
          value={documents.length}
          description="Uploaded"
          icon={<Upload className="h-5 w-5" />}
        />
        <StatCard
          title="Allocated Students"
          value={allocatedStudents.length}
          description="For feedback"
          icon={<Send className="h-5 w-5" />}
        />
      </div>

      {/* Posted Internships */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Posted Internships
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Seats</TableHead>
                  <TableHead>Applications</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {internships.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No internships posted yet. Go to "Post Internships" to create one.
                    </TableCell>
                  </TableRow>
                ) : (
                  internships.map((internship) => (
                    <TableRow key={internship.id}>
                      <TableCell className="font-medium">{internship.title}</TableCell>
                      <TableCell className="text-muted-foreground">{internship.seats}</TableCell>
                      <TableCell className="text-muted-foreground">{internship.applicationsCount}</TableCell>
                      <TableCell>
                        <StatusBadge status={internship.status} />
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => handleEditInternship(internship)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Documents */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Documents
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => window.location.href = '/company/documents'}>
            <Upload className="mr-2 h-4 w-4" />
            Upload
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No documents uploaded yet. Go to "Documents" to upload attendance, completion, acceptance letters, and CV files.
            </div>
          ) : (
            <div className="space-y-6">
              {documentsByCategory.map((section) => (
                <div key={section.title} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">{section.title}</h4>
                    <span className="text-xs text-muted-foreground">{section.docs.length} file(s)</span>
                  </div>
                  {section.docs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No {section.title.toLowerCase()} documents yet.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Document Name</TableHead>
                          <TableHead>Uploaded Date</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {section.docs.map((doc) => (
                          <TableRow key={doc.id}>
                            <TableCell className="font-medium">{doc.name}</TableCell>
                            <TableCell className="text-muted-foreground">{doc.uploadedDate}</TableCell>
                            <TableCell>
                              <Button variant="outline" size="sm" onClick={() => window.open(doc.url, '_blank')}>
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Internship Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Internship</DialogTitle>
            <DialogDescription>
              Make changes to the internship details here.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                Title
              </Label>
              <Input
                id="title"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="seats" className="text-right">
                Seats
              </Label>
              <Input
                id="seats"
                type="number"
                value={editForm.seats}
                onChange={(e) => setEditForm({ ...editForm, seats: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea
                id="description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleSaveEdit}>
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
