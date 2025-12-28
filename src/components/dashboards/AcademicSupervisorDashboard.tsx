import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { mockStudents, mockProgressReports } from '@/data/mockData';
import { GraduationCap, FileText, MessageSquare, Clock } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';

export function AcademicSupervisorDashboard() {
  const assignedStudents = mockStudents.filter(s => s.currentStatus === 'allocated');

  return (
    <div className="space-y-8">
      <PageHeader
        title="Academic Supervisor Dashboard"
        description="Monitor student progress and provide feedback"
      />

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Assigned Students"
          value={assignedStudents.length}
          description="Currently supervised"
          icon={<GraduationCap className="h-5 w-5" />}
        />
        <StatCard
          title="Progress Reports"
          value={mockProgressReports.length}
          description="Total submissions"
          icon={<FileText className="h-5 w-5" />}
        />
        <StatCard
          title="Pending Reviews"
          value={mockProgressReports.filter(r => r.status === 'pending').length}
          description="Awaiting feedback"
          icon={<Clock className="h-5 w-5" />}
        />
        <StatCard
          title="Messages"
          value={5}
          description="From students"
          icon={<MessageSquare className="h-5 w-5" />}
        />
      </div>

      {/* Assigned Students */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            My Students
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Student ID</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Specialization</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignedStudents.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">{student.name}</TableCell>
                  <TableCell className="text-muted-foreground">{student.studentId}</TableCell>
                  <TableCell className="text-muted-foreground">{student.allocatedCompany || 'N/A'}</TableCell>
                  <TableCell className="text-muted-foreground">{student.specialization}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm">View Progress</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Progress Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Recent Progress Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Month</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockProgressReports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium">{report.studentName}</TableCell>
                  <TableCell className="text-muted-foreground">{report.month}</TableCell>
                  <TableCell className="text-muted-foreground">{report.submittedDate}</TableCell>
                  <TableCell>
                    <StatusBadge status={report.status} />
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm">
                      {report.status === 'pending' ? 'Review' : 'View'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
