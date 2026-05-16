import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Building2, UserCheck, Bell, MessageSquare, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  getCompanies,
  getUsers,
  getFocalAnnouncements,
  getSupervisorAllStudents,
} from '@/lib/api';
import { Company, Student, User } from '@/types';

type FocalAnnouncement = {
  id?: string;
  _id?: string;
  title?: string;
  createdAt?: string;
  updatedAt?: string;
  status?: string;
  priority?: string;
};

export function UniversityFocalDashboard() {
  const { toast } = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [announcements, setAnnouncements] = useState<FocalAnnouncement[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [companiesData, usersData, announcementsData, studentsData] = await Promise.all([
        getCompanies(),
        getUsers(),
        getFocalAnnouncements(),
        getSupervisorAllStudents(),
      ]);

      setCompanies(Array.isArray(companiesData) ? companiesData : []);
      setUsers(Array.isArray(usersData) ? usersData : []);
      setAnnouncements(Array.isArray(announcementsData) ? announcementsData : []);
      setStudents(Array.isArray(studentsData) ? studentsData : []);
    } catch (error) {
      console.error('Failed to load focal dashboard data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const academicSupervisors = useMemo(
    () => users.filter((u) => u.role === 'academic_supervisor'),
    [users]
  );

  const activeAnnouncements = useMemo(
    () => announcements.filter((a) => String(a.status || 'active').toLowerCase() === 'active'),
    [announcements]
  );

  const unassignedCompanies = useMemo(
    () =>
      companies.filter((company: Company & { assignedSupervisor?: { id?: string } | string; supervisorId?: string }) => {
        const supId =
          company.supervisorId ||
          (typeof company.assignedSupervisor === 'object' && company.assignedSupervisor !== null
            ? company.assignedSupervisor.id
            : typeof company.assignedSupervisor === 'string'
              ? company.assignedSupervisor
              : '');
        return !supId;
      }),
    [companies]
  );

  const allocatedStudents = useMemo(
    () => students.filter((s) => s.currentStatus === 'allocated' || s.currentStatus === 'shortlisted'),
    [students]
  );

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
          value={loading ? 0 : companies.length}
          description="Total partnerships"
          icon={<Building2 className="h-5 w-5" />}
        />
        <StatCard
          title="Academic Supervisors"
          value={loading ? 0 : academicSupervisors.length}
          description="Available for assignment"
          icon={<UserCheck className="h-5 w-5" />}
        />
        <StatCard
          title="Active Announcements"
          value={loading ? 0 : activeAnnouncements.length}
          description="Current notices"
          icon={<Bell className="h-5 w-5" />}
        />
        <StatCard
          title="Open Issues"
          value={loading ? 0 : unassignedCompanies.length}
          description="Unassigned companies"
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
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading companies...</span>
            </div>
          ) : (
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
                {companies.map((company: Company & { assignedSupervisor?: { name?: string; id?: string } | string; supervisorName?: string; supervisorId?: string }) => {
                  const assignedName =
                    company.supervisorName ||
                    (typeof company.assignedSupervisor === 'object' && company.assignedSupervisor !== null
                      ? company.assignedSupervisor.name
                      : '');
                  return (
                    <TableRow key={company.id}>
                      <TableCell className="font-medium">{company.name}</TableCell>
                      <TableCell className="text-muted-foreground">{company.industry}</TableCell>
                      <TableCell className="text-muted-foreground">{company.location}</TableCell>
                      <TableCell className="text-muted-foreground">{assignedName || 'Not Assigned'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
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
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading announcements...</span>
            </div>
          ) : activeAnnouncements.length === 0 ? (
            <p className="text-sm text-muted-foreground">No announcements found.</p>
          ) : (
            <div className="space-y-4">
              {activeAnnouncements.slice(0, 5).map((announcement) => (
                <div key={announcement.id || announcement._id} className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">{announcement.title || 'Untitled announcement'}</p>
                    <p className="text-sm text-muted-foreground">
                      {String(announcement.createdAt || announcement.updatedAt || '').slice(0, 10)}
                    </p>
                  </div>
                  <Badge variant="outline">{announcement.priority || 'normal'}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Student Allocation Snapshot
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {allocatedStudents.length} student(s) currently shortlisted or allocated across supervised companies.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
