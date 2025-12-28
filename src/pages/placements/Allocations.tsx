import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { mockStudents, mockCompanies } from '@/data/mockData';
import { Users, UserPlus, Eye } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Student } from '@/types';

const allocationSchema = z.object({
  studentId: z.string().min(1, 'Please select a student'),
  companyId: z.string().min(1, 'Please select a company'),
});

type AllocationFormData = z.infer<typeof allocationSchema>;

export default function PlacementsAllocations() {
  const [students, setStudents] = useState(mockStudents);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const { toast } = useToast();

  const form = useForm<AllocationFormData>({
    resolver: zodResolver(allocationSchema),
    defaultValues: {
      studentId: '',
      companyId: '',
    },
  });

  const allocatedStudents = students.filter(s => s.currentStatus === 'allocated');
  const pendingStudents = students.filter(s => s.currentStatus !== 'allocated');

  const handleNewAllocation = () => {
    form.reset();
    setIsDialogOpen(true);
  };

  const handleAllocateStudent = (data: AllocationFormData) => {
    const company = mockCompanies.find(c => c.id === data.companyId);
    if (!company) return;

    const updatedStudents = students.map(student =>
      student.id === data.studentId
        ? { ...student, currentStatus: 'allocated' as const, allocatedCompany: company.name }
        : student
    );

    setStudents(updatedStudents);
    setIsDialogOpen(false);
    form.reset();

    toast({
      title: 'Student Allocated',
      description: `Student has been allocated to ${company.name}.`,
    });
  };

  const handleViewStudent = (student: Student) => {
    setViewingStudent(student);
  };

  const handleAllocateClick = (studentId: string) => {
    // Auto-select the student and open allocation dialog
    const student = students.find(s => s.id === studentId);
    if (student) {
      form.reset({
        studentId: student.id,
        companyId: '',
      });
      setIsDialogOpen(true);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <PageHeader
          title="Student Allocations"
          description="Manage student-company allocations"
          action={
            <Button onClick={handleNewAllocation}>
              <UserPlus className="h-4 w-4 mr-2" />
              New Allocation
            </Button>
          }
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Allocated Students
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
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allocatedStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell className="text-muted-foreground">{student.studentId}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {student.allocatedCompany || 'N/A'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{student.specialization}</TableCell>
                    <TableCell>
                      <Badge variant="default">Allocated</Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => handleViewStudent(student)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Pending Allocation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Specialization</TableHead>
                  <TableHead>CGPA</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell className="text-muted-foreground">{student.studentId}</TableCell>
                    <TableCell className="text-muted-foreground">{student.specialization}</TableCell>
                    <TableCell className="text-muted-foreground">{student.cgpa}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">Pending</Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => handleAllocateClick(student.id)}>Allocate</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* View Student Dialog */}
        <Dialog open={!!viewingStudent} onOpenChange={() => setViewingStudent(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{viewingStudent?.name}</DialogTitle>
            </DialogHeader>
            {viewingStudent && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Student ID</Label>
                    <p className="text-sm text-muted-foreground">{viewingStudent.studentId}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Email</Label>
                    <p className="text-sm text-muted-foreground">{viewingStudent.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Specialization</Label>
                    <p className="text-sm text-muted-foreground">{viewingStudent.specialization}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">CGPA</Label>
                    <p className="text-sm text-muted-foreground">{viewingStudent.cgpa}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Current Status</Label>
                    <Badge variant={viewingStudent.currentStatus === 'allocated' ? "default" : "secondary"}>
                      {viewingStudent.currentStatus}
                    </Badge>
                  </div>
                  {viewingStudent.allocatedCompany && (
                    <div>
                      <Label className="text-sm font-medium">Allocated Company</Label>
                      <p className="text-sm text-muted-foreground">{viewingStudent.allocatedCompany}</p>
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium">Applications Submitted</Label>
                  <p className="text-sm text-muted-foreground">{viewingStudent.applicationCount} / {viewingStudent.maxApplications}</p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* New Allocation Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>New Student Allocation</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleAllocateStudent)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="studentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Student</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a student" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {pendingStudents.map((student) => (
                            <SelectItem key={student.id} value={student.id}>
                              {student.name} ({student.studentId})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="companyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a company" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {mockCompanies.filter(c => c.isActive).map((company) => (
                            <SelectItem key={company.id} value={company.id}>
                              {company.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Allocate Student</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
