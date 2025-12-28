import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Megaphone, Plus, Pencil, Trash2 } from 'lucide-react';

export default function FocalAnnouncements() {
  const announcements = [
    { id: 1, title: 'SIT Registration Open', content: 'Registration for SIT 2024/2025 is now open...', date: '2024-01-15', status: 'active' },
    { id: 2, title: 'New Partner Companies', content: 'We welcome 5 new partner companies...', date: '2024-01-10', status: 'active' },
    { id: 3, title: 'Report Submission Deadline', content: 'Monthly reports are due by 25th...', date: '2024-01-05', status: 'archived' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <PageHeader
          title="Announcements"
          description="Manage system announcements"
          action={
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Announcement
            </Button>
          }
        />

        <div className="space-y-4">
          {announcements.map((announcement) => (
            <Card key={announcement.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Megaphone className="h-5 w-5" />
                    <CardTitle>{announcement.title}</CardTitle>
                    <Badge variant={announcement.status === 'active' ? 'default' : 'secondary'}>
                      {announcement.status}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-2">{announcement.content}</p>
                <p className="text-sm text-muted-foreground">Posted: {announcement.date}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
