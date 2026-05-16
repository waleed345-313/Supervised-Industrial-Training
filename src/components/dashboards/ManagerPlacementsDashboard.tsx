import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, UserCheck, BarChart3 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Application, Company, Student, User } from '@/types';
import { getApplications, getCompanies, getStudents, getUsers } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export function ManagerPlacementsDashboard() {
  const { toast } = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);

  function normalizeCompany(company: Company & { _id?: string; isActive?: boolean }): Company {
    return {
      ...company,
      id: String(company.id || company._id || ''),
      isActive: company.isActive !== false,
    };
  }

  function normalizeUser(user: User & { _id?: string }): User {
    return { ...user, id: String(user.id || user._id || '') };
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoadingCompanies(true);
        const [companiesData, usersData, studentsData, applicationsData] = await Promise.all([
          getCompanies(),
          getUsers(),
          getStudents(),
          getApplications(),
        ]);

        const normalizedCompanies = (companiesData as (Company & { _id?: string; isActive?: boolean })[])
          .map(normalizeCompany)
          .filter((c) => Boolean(c.id));

        const normalizedUsers = (usersData as (User & { _id?: string })[])
          .map(normalizeUser)
          .filter((u) => Boolean(u.id));

        setCompanies(normalizedCompanies);
        setUsers(normalizedUsers);
        setStudents(studentsData as Student[]);
        setApplications(applicationsData as Application[]);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load dashboard data.',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingCompanies(false);
      }
    };

    fetchData();
  }, [toast]);

  const activeCompanies = companies.filter((c) => c.isActive !== false);
  const allocatedStudents = students.filter((s) => s.currentStatus === 'allocated').length;
  const pendingApplications = applications.filter((a) => a.status === 'pending').length;

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
          value={activeCompanies.length}
          description="Active partnerships"
          icon={<Building2 className="h-5 w-5" />}
        />
        <StatCard
          title="Total Students"
          value={students.length}
          description="In current cycle"
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          title="Allocated"
          value={allocatedStudents}
          description={`${Math.round((allocatedStudents / Math.max(1, students.length)) * 100)}% placement rate`}
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
          {isLoadingCompanies ? (
            <div className="flex items-center justify-center py-8">
              <span className="text-muted-foreground">Loading companies...</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Company Focal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((company) => {
                  const companyFocal = users.find(
                    (user) => user.role === 'company_focal' && String(user.companyId || '') === String(company.id)
                  );
                  return (
                    <TableRow key={company.id}>
                      <TableCell className="font-medium">{company.name}</TableCell>
                      <TableCell className="text-muted-foreground">{company.industry}</TableCell>
                      <TableCell className="text-muted-foreground">{company.location}</TableCell>
                      <TableCell className="text-muted-foreground">{company.contactPerson}</TableCell>
                      <TableCell className="text-muted-foreground">{companyFocal?.name || 'Not Assigned'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
