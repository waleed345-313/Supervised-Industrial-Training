import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useRealtimePanelProgressReports } from '@/hooks/use-realtime-data';
import { FileText, Eye, CheckCircle } from 'lucide-react';

export default function PanelReports() {
  const { data: reports = [], loading } = useRealtimePanelProgressReports();

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <PageHeader
          title="Progress Reports"
          description="Review all submitted progress reports"
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Submitted Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Month</TableHead>
                  <TableHead>Industrial Remarks</TableHead>
                  <TableHead>Academic Remarks</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading || reports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No data found yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  reports.map((report: any) => (
                    <TableRow key={report._id || report.id}>
                      <TableCell className="font-medium">{report.studentName}</TableCell>
                      <TableCell className="text-muted-foreground">{report.month}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[150px] truncate">
                        {report.industrialRemarks || 'Pending'}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[150px] truncate">
                        {report.academicRemarks || 'Pending'}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={report.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {report.status !== 'approved' && (
                            <Button size="sm">
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
