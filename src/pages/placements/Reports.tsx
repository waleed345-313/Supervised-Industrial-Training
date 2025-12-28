import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Download, BarChart3, Users, Building2 } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function PlacementsReports() {
  const [viewingReport, setViewingReport] = useState<string | null>(null);
  const { toast } = useToast();

  const reports = [
    { 
      id: 'student-summary',
      title: 'Student Placement Summary', 
      description: 'Overview of all student placements', 
      icon: Users,
      content: 'This report provides a comprehensive overview of student placements including total students, allocated students, placement rates by specialization, and trends over time.'
    },
    { 
      id: 'company-partnership',
      title: 'Company Partnership Report', 
      description: 'Analysis of company partnerships', 
      icon: Building2,
      content: 'Detailed analysis of company partnerships including active companies, internship opportunities offered, student allocations per company, and partnership performance metrics.'
    },
    { 
      id: 'application-stats',
      title: 'Application Statistics', 
      description: 'Application trends and metrics', 
      icon: BarChart3,
      content: 'Statistical analysis of internship applications including application rates, acceptance rates, popular specializations, and application trends across different time periods.'
    },
    { 
      id: 'monthly-progress',
      title: 'Monthly Progress Report', 
      description: 'Monthly placement progress', 
      icon: FileText,
      content: 'Monthly progress tracking including new allocations, completed internships, student feedback, and key performance indicators for the placement office.'
    },
  ];

  const handleViewReport = (reportId: string) => {
    setViewingReport(reportId);
  };

  const handleDownloadReport = (reportId: string) => {
    const report = reports.find(r => r.id === reportId);
    if (report) {
      // Simulate download
      toast({
        title: 'Download Started',
        description: `${report.title} is being prepared for download.`,
      });
      
      // In a real application, this would trigger an actual download
      setTimeout(() => {
        toast({
          title: 'Download Complete',
          description: `${report.title} has been downloaded successfully.`,
        });
      }, 2000);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <PageHeader
          title="Reports"
          description="Generate and download placement reports"
        />

        <div className="grid gap-6 md:grid-cols-2">
          {reports.map((report, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <report.icon className="h-5 w-5" />
                  {report.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">{report.description}</p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => handleViewReport(report.id)}>
                    <FileText className="h-4 w-4 mr-2" />
                    View
                  </Button>
                  <Button onClick={() => handleDownloadReport(report.id)}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* View Report Dialog */}
        <Dialog open={!!viewingReport} onOpenChange={() => setViewingReport(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {viewingReport && reports.find(r => r.id === viewingReport)?.title}
              </DialogTitle>
            </DialogHeader>
            {viewingReport && (
              <div className="space-y-6">
                <div className="prose prose-sm max-w-none">
                  <p className="text-muted-foreground">
                    {reports.find(r => r.id === viewingReport)?.content}
                  </p>
                </div>
                
                {/* Mock report data */}
                <div className="border rounded-lg p-4 bg-muted/50">
                  <h4 className="font-medium mb-3">Report Preview</h4>
                  <div className="space-y-2 text-sm">
                    {viewingReport === 'student-summary' && (
                      <>
                        <p>• Total Students: 150</p>
                        <p>• Allocated Students: 95 (63.3% placement rate)</p>
                        <p>• Pending Students: 55</p>
                        <p>• Top Specializations: Software Engineering (45), Data Science (30)</p>
                      </>
                    )}
                    {viewingReport === 'company-partnership' && (
                      <>
                        <p>• Active Companies: 12</p>
                        <p>• Total Internship Seats: 180</p>
                        <p>• Average Students per Company: 7.9</p>
                        <p>• Top Performing Companies: TechCorp Inc., DataFlow Systems</p>
                      </>
                    )}
                    {viewingReport === 'application-stats' && (
                      <>
                        <p>• Total Applications: 320</p>
                        <p>• Average Applications per Student: 2.1</p>
                        <p>• Acceptance Rate: 29.7%</p>
                        <p>• Most Popular Specialization: Software Engineering</p>
                      </>
                    )}
                    {viewingReport === 'monthly-progress' && (
                      <>
                        <p>• New Allocations This Month: 15</p>
                        <p>• Completed Internships: 8</p>
                        <p>• Student Satisfaction Rate: 4.2/5</p>
                        <p>• Placement Office KPI: 87% target achieved</p>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setViewingReport(null)}>
                    Close
                  </Button>
                  <Button onClick={() => handleDownloadReport(viewingReport)}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Report
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
