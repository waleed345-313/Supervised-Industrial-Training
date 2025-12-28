import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { mockCompanies, mockStudents, mockApplications } from '@/data/mockData';
import { Building2, Users, UserCheck, BarChart3, Plus } from 'lucide-react';

export function ManagerPlacementsDashboard() {
  const allocatedStudents = mockStudents.filter(s => s.currentStatus === 'allocated').length;
  const pendingApplications = mockApplications.filter(a => a.status === 'pending').length;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Placements Dashboard"
        description="Manage company partnerships and student allocations"

      />

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Partner Companies"
          value={mockCompanies.filter(c => c.isActive).length}
          description="Active partnerships"
          icon={<Building2 className="h-5 w-5" />}
        />
        <StatCard
          title="Total Students"
          value={mockStudents.length}
          description="In current cycle"
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          title="Allocated"
          value={allocatedStudents}
          description={`${Math.round((allocatedStudents / mockStudents.length) * 100)}% placement rate`}
          icon={<UserCheck className="h-5 w-5" />}
        />
        <StatCard
          title="Pending"
          value={pendingApplications}
          description="Applications to review"
          icon={<BarChart3 className="h-5 w-5" />}
        />
      </div>

      {/* Company Pool */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Company Pool
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Contact</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockCompanies.map((company) => (
                <TableRow key={company.id}>
                  <TableCell className="font-medium">{company.name}</TableCell>
                  <TableCell className="text-muted-foreground">{company.industry}</TableCell>
                  <TableCell className="text-muted-foreground">{company.location}</TableCell>
                  <TableCell className="text-muted-foreground">{company.contactPerson}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
