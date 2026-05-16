import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Building2, Eye, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { Fragment, useState, useEffect } from 'react';
import { Company } from '@/types';
import { getCompanies, getInternships, getStudents, getApplications, getUsers } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

type RawStudent = {
  id?: string;
  _id?: string;
  name?: string;
  email?: string;
  studentId?: string;
  batch?: string;
  specialization?: string;
  cgpa?: number;
  allocatedCompanyId?: string;
  shortlistedCompanyId?: string;
  user?: {
    _id?: string;
    id?: string;
    name?: string;
    email?: string;
    studentId?: string;
    batch?: string;
    cgpa?: number;
  };
};

type RawUser = {
  id?: string;
  _id?: string;
  role?: string;
  name?: string;
  email?: string;
  studentId?: string;
  batch?: string;
  cgpa?: number;
};

type RawApplication = {
  id?: string;
  _id?: string;
  status?: string;
  company?: string | { _id?: string; id?: string };
  companyId?: string;
  companyName?: string;
  studentUser?: string | { _id?: string; id?: string };
  studentId?: string;
  studentName?: string;
};

function getCompanyId(company: Partial<Company> & { _id?: string }) {
  return String(company.id || company._id || '');
}

export default function FocalCompanies() {
  const [viewingCompany, setViewingCompany] = useState<Company | null>(null);
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());
  const [companies, setCompanies] = useState<Company[]>([]);
  const [internships, setInternships] = useState<any[]>([]);
  const [students, setStudents] = useState<RawStudent[]>([]);
  const [users, setUsers] = useState<RawUser[]>([]);
  const [applications, setApplications] = useState<RawApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const normalizedCompanies = companies
    .map((company) => ({ ...company, id: getCompanyId(company as Company & { _id?: string }) }))
    .filter((company) => Boolean(company.id));

  const studentsByUserId = new Map(
    students
      .flatMap((student) => {
        const keys = [student.user?._id, student.user?.id, student.id, student._id]
          .map((key) => String(key || '').trim())
          .filter(Boolean);
        return keys.map((key) => [key, student] as const);
      })
  );

  const usersByUserId = new Map(
    users
      .map((user) => {
        const userId = String(user.id || user._id || '').trim();
        return userId ? [userId, user] as const : null;
      })
      .filter(Boolean) as Array<readonly [string, RawUser]>
  );

  const getCompanyApplications = (company: Company) => {
    const companyId = getCompanyId(company as Company & { _id?: string });
    return applications.filter((application) => {
      const status = String(application?.status || '').toLowerCase();
      if (!['shortlisted', 'allocated', 'rejected'].includes(status)) return false;

      const appCompanyId = String(
        (typeof application?.company === 'object'
          ? application.company?._id ?? application.company?.id
          : application?.company) ?? application?.companyId ?? ''
      );
      const appCompanyName = String(application?.companyName || '').trim().toLowerCase();
      return appCompanyId === companyId || appCompanyName === String(company.name || '').trim().toLowerCase();
    });
  };

  const buildCompanyStudent = (application: RawApplication) => {
    const studentUserId = String(
      (typeof application?.studentUser === 'object'
        ? application.studentUser?._id ?? application.studentUser?.id
        : application?.studentUser) ?? application?.studentId ?? ''
    );
    const student = studentsByUserId.get(studentUserId);
    const user = usersByUserId.get(studentUserId);
    const fallbackId = `${application.id || application._id || application.studentName}-${application.status || 'unknown'}`;
    const resolvedStudentId = student?.id ?? student?._id ?? studentUserId;

    return {
      id: resolvedStudentId || fallbackId,
      name: student?.name ?? student?.user?.name ?? application.studentName ?? 'N/A',
      batch: student?.batch ?? student?.user?.batch ?? user?.batch ?? 'FA23',
      registrationNo: student?.studentId ?? student?.user?.studentId ?? user?.studentId ?? 'N/A',
      cgpa: student?.cgpa ?? student?.user?.cgpa ?? user?.cgpa ?? (typeof (application as any)?.studentCGPA === 'string' ? Number((application as any).studentCGPA) : undefined),
      email: student?.email ?? student?.user?.email ?? 'N/A',
    };
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [companiesData, internshipsData, studentsData, applicationsData, usersData] = await Promise.all([
          getCompanies(),
          getInternships(),
          getStudents(),
          getApplications(),
          getUsers(),
        ]);
        setCompanies(companiesData);
        setInternships(internshipsData);
        setStudents(Array.isArray(studentsData) ? studentsData : []);
        setApplications(Array.isArray(applicationsData) ? applicationsData : []);
        setUsers(Array.isArray(usersData) ? usersData : []);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load companies data.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  const handleViewCompany = (company: Company) => {
    setViewingCompany(company);
  };

  const toggleCompanyExpansion = (companyId: string) => {
    const newExpanded = new Set(expandedCompanies);
    if (newExpanded.has(companyId)) {
      newExpanded.delete(companyId);
    } else {
      newExpanded.add(companyId);
    }
    setExpandedCompanies(newExpanded);
  };
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <PageHeader
          title="Companies"
          description="View and manage company partnerships"
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Partner Companies
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading companies...</span>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company Name</TableHead>
                    <TableHead>Industry</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>SIT Seats</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {normalizedCompanies.map((company) => {
                    const companyId = getCompanyId(company as Company & { _id?: string });
                    const companyApplications = getCompanyApplications(company);
                    const shortlistedStudents = companyApplications
                      .filter((application) => String(application?.status || '').toLowerCase() === 'shortlisted')
                      .map(buildCompanyStudent);
                    const acceptedStudents = companyApplications
                      .filter((application) => String(application?.status || '').toLowerCase() === 'allocated')
                      .map(buildCompanyStudent);
                    const rejectedStudents = companyApplications
                      .filter((application) => String(application?.status || '').toLowerCase() === 'rejected')
                      .map(buildCompanyStudent);

                    const companyInternships = internships.filter(
                      (i) => String(i.company?._id ?? i.company?.id ?? i.company) === companyId
                    );
                    const totalSeats = companyInternships.reduce(
                      (total, internship) => total + Number(internship?.seats || 0),
                      0
                    );
                    const filledSeats = acceptedStudents.length;
                    
                    const isExpanded = expandedCompanies.has(companyId);
                    
                    return (
                      <Fragment key={companyId}>
                        <TableRow>
                          <TableCell className="font-medium">
                            <Button variant="ghost" size="sm" className="p-0 h-auto font-medium" onClick={() => toggleCompanyExpansion(companyId)}>
                              <div className="flex items-center gap-2">
                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                {company.name}
                              </div>
                            </Button>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{company.industry}</TableCell>
                          <TableCell className="text-muted-foreground">{company.location}</TableCell>
                          <TableCell className="text-muted-foreground">{filledSeats}/{totalSeats}</TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm" onClick={() => handleViewCompany(company)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow>
                            <TableCell colSpan={5} className="bg-muted/50 p-0">
                              <div className="p-4 space-y-4">
                                <div>
                                  <h4 className="font-medium mb-2">Shortlisted Students ({shortlistedStudents.length})</h4>
                                  {shortlistedStudents.length > 0 ? (
                                    <div className="space-y-2">
                                      {shortlistedStudents.map((student) => (
                                        <div key={`${student.id}-shortlisted`} className="flex items-center justify-between bg-background p-3 rounded-md border">
                                          <div>
                                            <p className="font-medium">{student.name}</p>
                                            <p className="text-sm text-muted-foreground">ID: {student.batch} | {student.registrationNo}</p>
                                          </div>
                                          <div className="text-right">
                                            <p className="text-sm font-medium">CGPA: {student.cgpa ?? 'N/A'}</p>
                                            <p className="text-sm text-muted-foreground">{student.email}</p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-muted-foreground">No shortlisted students currently linked to this company.</p>
                                  )}
                                </div>

                                <div>
                                  <h4 className="font-medium mb-2">Accepted Students ({acceptedStudents.length})</h4>
                                  {acceptedStudents.length > 0 ? (
                                    <div className="space-y-2">
                                      {acceptedStudents.map((student) => (
                                        <div key={`${student.id}-allocated`} className="flex items-center justify-between bg-background p-3 rounded-md border">
                                          <div>
                                            <p className="font-medium">{student.name}</p>
                                            <p className="text-sm text-muted-foreground">ID: {student.batch} | {student.registrationNo}</p>
                                          </div>
                                          <div className="text-right">
                                            <p className="text-sm font-medium">CGPA: {student.cgpa ?? 'N/A'}</p>
                                            <p className="text-sm text-muted-foreground">{student.email}</p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-muted-foreground">No accepted students currently linked to this company.</p>
                                  )}
                                </div>

                                <div>
                                  <h4 className="font-medium mb-2">Rejected Students ({rejectedStudents.length})</h4>
                                  {rejectedStudents.length > 0 ? (
                                    <div className="space-y-2">
                                      {rejectedStudents.map((student) => (
                                        <div key={`${student.id}-rejected`} className="flex items-center justify-between bg-background p-3 rounded-md border">
                                          <div>
                                            <p className="font-medium">{student.name}</p>
                                            <p className="text-sm text-muted-foreground">ID: {student.batch} | {student.registrationNo}</p>
                                          </div>
                                          <div className="text-right">
                                            <p className="text-sm font-medium">CGPA: {student.cgpa ?? 'N/A'}</p>
                                            <p className="text-sm text-muted-foreground">{student.email}</p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-muted-foreground">No rejected students currently linked to this company.</p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* View Company Dialog */}
      <Dialog open={!!viewingCompany} onOpenChange={() => setViewingCompany(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewingCompany?.name}</DialogTitle>
          </DialogHeader>
          {viewingCompany && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Industry</Label>
                  <p className="text-sm text-muted-foreground">{viewingCompany.industry}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Location</Label>
                  <p className="text-sm text-muted-foreground">{viewingCompany.location}</p>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Website</Label>
                <p className="text-sm text-muted-foreground">
                  <a href={viewingCompany.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {viewingCompany.website}
                  </a>
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Description</Label>
                <p className="text-sm text-muted-foreground">{viewingCompany.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Contact Person</Label>
                  <p className="text-sm text-muted-foreground">{viewingCompany.contactPerson}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Contact Email</Label>
                  <p className="text-sm text-muted-foreground">{viewingCompany.contactEmail}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
