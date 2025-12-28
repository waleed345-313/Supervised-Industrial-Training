import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { mockCompanies, mockUsers } from '@/data/mockData';
import { Building2, UserCheck, Bell, MessageSquare, Plus } from 'lucide-react';

export function UniversityFocalDashboard() {
  const academicSupervisors = mockUsers.filter(u => u.role === 'academic_supervisor');

  return (
    <div className="space-y-8">
      <PageHeader
        title="University Focal Dashboard"
        description="Manage companies and supervisor assignments"
      />

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Registered Companies"
          value={mockCompanies.length}
          description="Total partnerships"
          icon={<Building2 className="h-5 w-5" />}
        />
        <StatCard
          title="Academic Supervisors"
          value={academicSupervisors.length}
          description="Available for assignment"
          icon={<UserCheck className="h-5 w-5" />}
        />
        <StatCard
          title="Active Announcements"
          value={3}
          description="Current notices"
          icon={<Bell className="h-5 w-5" />}
        />
        <StatCard
          title="Open Issues"
          value={2}
          description="Requires attention"
          icon={<MessageSquare className="h-5 w-5" />}
        />
      </div>

      {/* Companies Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Registered Companies
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Assigned Supervisor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockCompanies.map((company, index) => (
                <TableRow key={company.id}>
                  <TableCell className="font-medium">{company.name}</TableCell>
                  <TableCell className="text-muted-foreground">{company.industry}</TableCell>
                  <TableCell className="text-muted-foreground">{company.location}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {index < academicSupervisors.length ? academicSupervisors[index % academicSupervisors.length]?.name : 'Not Assigned'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Announcements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Recent Announcements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { title: 'New Company Partnership', date: '2024-02-15', type: 'info' },
              { title: 'Deadline Extended for Applications', date: '2024-02-10', type: 'warning' },
              { title: 'Orientation Session Scheduled', date: '2024-02-05', type: 'info' },
            ].map((announcement, index) => (
              <div key={index} className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">{announcement.title}</p>
                  <p className="text-sm text-muted-foreground">{announcement.date}</p>
                </div>
                <Badge variant="outline">{announcement.type}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
