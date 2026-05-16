import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Megaphone, Plus, Pencil, Trash2, RefreshCw, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getFocalAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Announcement {
  id: string;
  title: string;
  content: string;
  status: 'active' | 'archived';
  priority: 'low' | 'normal' | 'high';
  targetRoles: string[];
  createdAt: string;
}

const TARGET_ROLES = [
  { id: 'student', label: 'Students' },
  { id: 'academic_supervisor', label: 'Academic Supervisors' },
  { id: 'industrial_supervisor', label: 'Industrial Supervisors' },
  { id: 'company_focal', label: 'Company Focal Persons' },
  { id: 'manager_placements', label: 'Placement Managers' },
];

export default function FocalAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'normal' as 'low' | 'normal' | 'high',
    targetRoles: ['student'] as string[],
  });
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const data = await getFocalAnnouncements();
      setAnnouncements(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load announcements',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const openCreateDialog = () => {
    setIsEdit(false);
    setSelectedAnnouncement(null);
    setFormData({
      title: '',
      content: '',
      priority: 'normal',
      targetRoles: ['student'],
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (announcement: Announcement) => {
    setIsEdit(true);
    setSelectedAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      priority: announcement.priority,
      targetRoles: announcement.targetRoles.length > 0 ? announcement.targetRoles : ['student'],
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast({
        title: 'Error',
        description: 'Title and content are required',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit && selectedAnnouncement) {
        await updateAnnouncement(selectedAnnouncement.id, {
          title: formData.title,
          content: formData.content,
          priority: formData.priority,
          targetRoles: formData.targetRoles,
        });
        toast({
          title: 'Success',
          description: 'Announcement updated successfully',
        });
      } else {
        await createAnnouncement({
          title: formData.title,
          content: formData.content,
          priority: formData.priority,
          targetRoles: formData.targetRoles,
        });
        toast({
          title: 'Success',
          description: 'Announcement created and notifications sent to selected users',
        });
      }
      setIsDialogOpen(false);
      fetchAnnouncements();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save announcement',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await deleteAnnouncement(id);
      toast({
        title: 'Success',
        description: 'Announcement deleted',
      });
      fetchAnnouncements();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete announcement',
        variant: 'destructive',
      });
    }
  };

  const toggleTargetRole = (roleId: string) => {
    setFormData(prev => ({
      ...prev,
      targetRoles: prev.targetRoles.includes(roleId)
        ? prev.targetRoles.filter(r => r !== roleId)
        : [...prev.targetRoles, roleId],
    }));
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">High</Badge>;
      case 'normal':
        return <Badge variant="default">Normal</Badge>;
      default:
        return <Badge variant="secondary">Low</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <PageHeader
          title="Announcements"
          description="Manage system announcements and notify users"
          action={
            <div className="flex gap-2">
              <Button variant="outline" onClick={fetchAnnouncements} disabled={loading}>
                <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                Refresh
              </Button>
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                New Announcement
              </Button>
            </div>
          }
        />

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{isEdit ? 'Edit Announcement' : 'New Announcement'}</DialogTitle>
              <DialogDescription>
                {isEdit
                  ? 'Update the announcement details'
                  : 'Create a new announcement. It will be sent as a notification to selected users.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Enter announcement title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  placeholder="Enter announcement content"
                  rows={4}
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value: 'low' | 'normal' | 'high') =>
                    setFormData(prev => ({ ...prev, priority: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Target Users</Label>
                <div className="space-y-2 border rounded-md p-3">
                  {TARGET_ROLES.map((role) => (
                    <div key={role.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={role.id}
                        checked={formData.targetRoles.includes(role.id)}
                        onCheckedChange={() => toggleTargetRole(role.id)}
                      />
                      <label htmlFor={role.id} className="text-sm cursor-pointer">
                        {role.label}
                      </label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Selected users will receive a notification when you publish this announcement.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEdit ? 'Update' : 'Publish Announcement'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Announcements List */}
        <div className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">Loading announcements...</p>
              </CardContent>
            </Card>
          ) : announcements.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Megaphone className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No announcements yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first announcement to notify students and other users
                </p>
                <Button onClick={openCreateDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Announcement
                </Button>
              </CardContent>
            </Card>
          ) : (
            announcements.map((announcement) => (
              <Card key={announcement.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Megaphone className="h-5 w-5" />
                      <CardTitle className="text-lg">{announcement.title}</CardTitle>
                      <Badge variant={announcement.status === 'active' ? 'default' : 'secondary'}>
                        {announcement.status}
                      </Badge>
                      {getPriorityBadge(announcement.priority)}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(announcement)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(announcement.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-3">{announcement.content}</p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                    <span>Posted: {formatDate(announcement.createdAt)}</span>
                    <span>
                      Target: {announcement.targetRoles?.length > 0
                        ? announcement.targetRoles.map(r =>
                            TARGET_ROLES.find(tr => tr.id === r)?.label || r
                          ).join(', ')
                        : 'All Students'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
