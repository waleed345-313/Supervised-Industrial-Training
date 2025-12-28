import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { mockProgressReports } from '@/data/mockData';
import { FileText, CheckCircle, Check, X } from 'lucide-react';
import { useState } from 'react';

export default function SupervisorProgress() {
  const [selectedReport, setSelectedReport] = useState<typeof mockProgressReports[0] | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleApprove = () => {
    // In a real app, this would update the report status via API
    console.log('Approved report:', selectedReport?.id);
    setIsDialogOpen(false);
  };

  const handleReject = () => {
    // In a real app, this would update the report status via API
    console.log('Rejected report:', selectedReport?.id);
    setIsDialogOpen(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <PageHeader
          title="Progress Reports"
          description="Review student progress reports"
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
                      <div className="flex gap-2">
                        {report.status === 'pending' ? (
                          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                              <Button size="sm" onClick={() => setSelectedReport(report)}>
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Review
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                  <FileText className="h-5 w-5" />
                                  Progress Report Review
                                </DialogTitle>
                              </DialogHeader>
                              {selectedReport && (
                                <div className="space-y-6">
                                  {/* Report Header */}
                                  <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                                    <div>
                                      <span className="text-sm font-medium">Student:</span>
                                      <p className="text-sm text-muted-foreground">{selectedReport.studentName}</p>
                                    </div>
                                    <div>
                                      <span className="text-sm font-medium">Month:</span>
                                      <p className="text-sm text-muted-foreground">{selectedReport.month}</p>
                                    </div>
                                    <div>
                                      <span className="text-sm font-medium">Submitted:</span>
                                      <p className="text-sm text-muted-foreground">{selectedReport.submittedDate}</p>
                                    </div>
                                    <div>
                                      <span className="text-sm font-medium">Status:</span>
                                      <StatusBadge status={selectedReport.status} />
                                    </div>
                                  </div>

                                  {/* Report Content */}
                                  <div className="space-y-4">
                                    <div>
                                      <h4 className="text-sm font-medium mb-2">Progress Summary</h4>
                                      <div className="p-4 border rounded-lg bg-background">
                                        <p className="text-sm">{selectedReport.summary}</p>
                                      </div>
                                    </div>

                                    {selectedReport.industrialRemarks && (
                                      <div>
                                        <h4 className="text-sm font-medium mb-2">Industrial Supervisor Remarks</h4>
                                        <div className="p-4 border rounded-lg bg-background">
                                          <p className="text-sm">{selectedReport.industrialRemarks}</p>
                                        </div>
                                      </div>
                                    )}

                                    {selectedReport.academicRemarks && (
                                      <div>
                                        <h4 className="text-sm font-medium mb-2">Previous Academic Remarks</h4>
                                        <div className="p-4 border rounded-lg bg-background">
                                          <p className="text-sm">{selectedReport.academicRemarks}</p>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Action Buttons */}
                                  <div className="flex gap-3 pt-4 border-t">
                                    <Button onClick={handleApprove} className="flex-1">
                                      <Check className="h-4 w-4 mr-2" />
                                      Approve
                                    </Button>
                                    <Button onClick={handleReject} variant="destructive" className="flex-1">
                                      <X className="h-4 w-4 mr-2" />
                                      Reject
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        ) : (
                          <Button variant="outline" size="sm" disabled>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Reviewed
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
