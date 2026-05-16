import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { roleLabels } from '@/data/mockData';
import { Users, Building2, GraduationCap, Settings } from 'lucide-react';
import api from '@/lib/api';
import { User, Student } from '@/types';

export function AdminDashboard() {
  const [allUsers, setAllUsers] = useState<(User | Student)[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersData, companiesData] = await Promise.all([
          api.getUsers(),
          api.getCompanies()
        ]);
        setAllUsers(usersData);
        setCompanies(companiesData);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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
          value={loading ? "..." : allUsers.length}
          description="All registered users"
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          title="Active Students"
          value={loading ? "..." : allUsers.filter(u => u.role === 'student').length}
          description="Enrolled in program"
          icon={<GraduationCap className="h-5 w-5" />}
        />
        <StatCard
          title="Partner Companies"
          value={loading ? "..." : companies.filter(c => c.isActive).length}
          description="Active partnerships"
          icon={<Building2 className="h-5 w-5" />}
        />
        <StatCard
          title="Staff Members"
          value={loading ? "..." : allUsers.filter(u => u.role !== 'student' && u.role !== 'admin').length}
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
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    Loading users...
                  </TableCell>
                </TableRow>
              ) : recentUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                recentUsers.slice(0, 8).map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{roleLabels[user.role]}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.department || '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
