import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { mockInternships, mockDocuments } from '@/data/mockData';
import { Briefcase, Upload, Send, FileText, Plus, Pencil } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Internship } from '@/types';

export function CompanyFocalDashboard() {
  const companyInternships = mockInternships.filter(i => i.company.name === 'TechCorp Inc.');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedInternship, setSelectedInternship] = useState<Internship | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    seats: '',
    deadline: '',
    description: ''
  });
  const { toast } = useToast();

  const handleEditInternship = (internship: Internship) => {
    setSelectedInternship(internship);
    setEditForm({
      title: internship.title,
      seats: internship.seats.toString(),
      deadline: internship.deadline,
      description: internship.description
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    // In a real app, this would update the internship
    toast({
      title: "Internship Updated",
      description: `${editForm.title} has been updated successfully.`,
    });
    setIsEditDialogOpen(false);
    setSelectedInternship(null);
  };

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
          value={companyInternships.filter(i => i.status === 'open').length}
          description="Open seats"
          icon={<Briefcase className="h-5 w-5" />}
        />
        <StatCard
          title="Total Applications"
          value={companyInternships.reduce((sum, i) => sum + i.applicationsCount, 0)}
          description="Received"
          icon={<FileText className="h-5 w-5" />}
        />
        <StatCard
          title="Documents"
          value={mockDocuments.length}
          description="Uploaded"
          icon={<Upload className="h-5 w-5" />}
        />
        <StatCard
          title="Feedback"
          value={2}
          description="Pending responses"
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Seats</TableHead>
                <TableHead>Applications</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companyInternships.map((internship) => (
                <TableRow key={internship.id}>
                  <TableCell className="font-medium">{internship.title}</TableCell>
                  <TableCell className="text-muted-foreground">{internship.seats}</TableCell>
                  <TableCell className="text-muted-foreground">{internship.applicationsCount}</TableCell>
                  <TableCell className="text-muted-foreground">{internship.deadline}</TableCell>
                  <TableCell>
                    <StatusBadge status={internship.status} />
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => handleEditInternship(internship)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Documents */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Documents
          </CardTitle>
          <Button variant="outline" size="sm">
            <Upload className="mr-2 h-4 w-4" />
            Upload
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Uploaded Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockDocuments.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">{doc.name}</TableCell>
                  <TableCell className="text-muted-foreground capitalize">{doc.type.replace('_', ' ')}</TableCell>
                  <TableCell className="text-muted-foreground">{doc.uploadedDate}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm">Download</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
              <Label htmlFor="deadline" className="text-right">
                Deadline
              </Label>
              <Input
                id="deadline"
                type="date"
                value={editForm.deadline}
                onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value })}
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
