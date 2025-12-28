import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { mockCompanies, mockInternships, mockApplications, mockStudents } from '@/data/mockData';
import { Building2, Eye, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Company } from '@/types';

export default function FocalCompanies() {
  const [viewingCompany, setViewingCompany] = useState<Company | null>(null);
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());

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
                {mockCompanies.map((company) => {
                  const companyInternships = mockInternships.filter(
                    i => i.company.id === company.id
                  );
                  const totalSeats = companyInternships.length * 5;
                  const filledSeats = companyInternships.reduce((total, internship) => {
                    const allocatedApps = mockApplications.filter(
                      app => app.internshipId === internship.id && app.status === 'allocated'
                    ).length;
                    return total + allocatedApps;
                  }, 0);
                  
                  // Get allocated students for this company
                  const allocatedStudents = mockStudents.filter(student => 
                    student.allocatedCompany === company.name
                  );
                  
                  const isExpanded = expandedCompanies.has(company.id);
                  
                  return (
                    <>
                      <TableRow>
                        <TableCell className="font-medium">
                          <Button variant="ghost" size="sm" className="p-0 h-auto font-medium" onClick={() => toggleCompanyExpansion(company.id)}>
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
                            <div className="p-4">
                              <h4 className="font-medium mb-2">Allocated Students ({allocatedStudents.length})</h4>
                              {allocatedStudents.length > 0 ? (
                                <div className="space-y-2">
                                  {allocatedStudents.map((student) => (
                                    <div key={student.id} className="flex items-center justify-between bg-background p-3 rounded-md border">
                                      <div>
                                        <p className="font-medium">{student.name}</p>
                                        <p className="text-sm text-muted-foreground">ID: {student.studentId} | {student.specialization}</p>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-sm font-medium">CGPA: {student.cgpa}</p>
                                        <p className="text-sm text-muted-foreground">{student.email}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-muted-foreground">No students currently allocated to this company.</p>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
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
