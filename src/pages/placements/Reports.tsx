import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Download, BarChart3, Users, Building2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { getApplications, getCompanies, getInternships, getProgressReports, getStudents } from '@/lib/api';
import { Application, Company, Internship, ProgressReport, Student } from '@/types';

export default function PlacementsReports() {
  const [viewingReport, setViewingReport] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [internships, setInternships] = useState<Internship[]>([]);
  const [progressReports, setProgressReports] = useState<ProgressReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [companiesData, studentsData, applicationsData, internshipsData, progressReportsData] =
          await Promise.all([
            getCompanies(),
            getStudents(),
            getApplications(),
            getInternships(),
            getProgressReports(),
          ]);
        setCompanies(companiesData as Company[]);
        setStudents(studentsData as Student[]);
        setApplications(applicationsData as Application[]);
        setInternships(internshipsData as Internship[]);
        setProgressReports(progressReportsData as ProgressReport[]);
      } catch (error) {
        console.error('Error loading reports data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load reports data.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  const metrics = useMemo(() => {
    const activeCompanies = companies.filter((c: any) => c?.isActive !== false).length;
    const totalStudents = students.length;
    const allocatedStudents = students.filter((s) => s.currentStatus === 'allocated').length;
    const pendingStudents = Math.max(0, totalStudents - allocatedStudents);
    const placementRate = totalStudents ? (allocatedStudents / totalStudents) * 100 : 0;

    const totalApplications = applications.length;
    const avgApplicationsPerStudent = totalStudents ? totalApplications / totalStudents : 0;
    const acceptedApplications = applications.filter((a) => a.status === 'allocated').length;
    const acceptanceRate = totalApplications ? (acceptedApplications / totalApplications) * 100 : 0;

    const totalInternships = internships.length;
    const totalSeats = internships.reduce((sum, i) => sum + (Number(i.seats) || 0), 0);

    const prPending = progressReports.filter((r) => r.status === 'pending').length;
    const prReviewed = progressReports.filter((r) => r.status === 'reviewed').length;
    const prApproved = progressReports.filter((r) => r.status === 'approved').length;

    return {
      activeCompanies,
      totalStudents,
      allocatedStudents,
      pendingStudents,
      placementRate,
      totalApplications,
      avgApplicationsPerStudent,
      acceptanceRate,
      totalInternships,
      totalSeats,
      prPending,
      prReviewed,
      prApproved,
    };
  }, [companies, students, applications, internships, progressReports]);

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
                
                {/* Live report data */}
                <div className="border rounded-lg p-4 bg-muted/50">
                  <h4 className="font-medium mb-3">Report Preview</h4>
                  <div className="space-y-2 text-sm">
                    {isLoading && <p className="text-muted-foreground">Loading data...</p>}
                    {!isLoading && viewingReport === 'student-summary' && (
                      <>
                        <p>• Total Students: {metrics.totalStudents}</p>
                        <p>
                          • Allocated Students: {metrics.allocatedStudents} ({metrics.placementRate.toFixed(1)}% placement rate)
                        </p>
                        <p>• Pending Students: {metrics.pendingStudents}</p>
                      </>
                    )}
                    {!isLoading && viewingReport === 'company-partnership' && (
                      <>
                        <p>• Active Companies: {metrics.activeCompanies}</p>
                        <p>• Total Internships: {metrics.totalInternships}</p>
                        <p>• Total Internship Seats: {metrics.totalSeats}</p>
                        <p>
                          • Average Students per Company:{' '}
                          {metrics.activeCompanies ? (metrics.allocatedStudents / metrics.activeCompanies).toFixed(1) : '0.0'}
                        </p>
                      </>
                    )}
                    {!isLoading && viewingReport === 'application-stats' && (
                      <>
                        <p>• Total Applications: {metrics.totalApplications}</p>
                        <p>• Average Applications per Student: {metrics.avgApplicationsPerStudent.toFixed(2)}</p>
                        <p>• Acceptance Rate: {metrics.acceptanceRate.toFixed(1)}%</p>
                      </>
                    )}
                    {!isLoading && viewingReport === 'monthly-progress' && (
                      <>
                        <p>• Progress Reports (Pending): {metrics.prPending}</p>
                        <p>• Progress Reports (Reviewed): {metrics.prReviewed}</p>
                        <p>• Progress Reports (Approved): {metrics.prApproved}</p>
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
