import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { mockUsers, mockStudents, mockCompanies, roleLabels } from '@/data/mockData';
import { Users, Building2, GraduationCap, Settings } from 'lucide-react';

export function AdminDashboard() {
  const allUsers = [...mockUsers, ...mockStudents];
  const recentUsers = allUsers.filter(u => u.role !== 'admin');

  return (
    <div className="space-y-8">
      <PageHeader
        title="Administrator Dashboard"
        description="System overview and user management"
      />

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={allUsers.length}
          description="All registered users"
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          title="Active Students"
          value={mockStudents.length}
          description="Enrolled in program"
          icon={<GraduationCap className="h-5 w-5" />}
        />
        <StatCard
          title="Partner Companies"
          value={mockCompanies.filter(c => c.isActive).length}
          description="Active partnerships"
          icon={<Building2 className="h-5 w-5" />}
        />
        <StatCard
          title="Staff Members"
          value={mockUsers.length}
          description="University & industry"
          icon={<Settings className="h-5 w-5" />}
        />
      </div>

      {/* Recent Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Recent Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Department</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentUsers.slice(0, 8).map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{roleLabels[user.role]}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{user.department}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
