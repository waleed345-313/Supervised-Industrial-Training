import { useState, useEffect } from "react";
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { mockInternships } from '@/data/mockData';
import { Briefcase, Plus, Eye, Pencil, Trash2 } from 'lucide-react';
import { Internship } from '@/types';

const internshipSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(100, "Title must be less than 100 characters"),
  description: z.string().min(50, "Description must be at least 50 characters").max(1000, "Description must be less than 1000 characters"),
  location: z.string().min(3, "Location is required"),
  duration: z.string().min(1, "Please select duration"),
  seats: z.string().min(1, "Number of seats is required").refine((val) => !isNaN(Number(val)) && Number(val) > 0, "Must be a positive number"),
  deadline: z.string().min(1, "Application deadline is required"),
  requirements: z.string().min(20, "Requirements must be at least 20 characters"),
  specializations: z.array(z.string()).min(1, "Select at least one specialization"),
});

type InternshipFormData = z.infer<typeof internshipSchema>;

const specializations = [
  { id: 'se', label: 'Software Engineering' },
  { id: 'ds', label: 'Data Science' },
  { id: 'cs', label: 'Cybersecurity' },
  { id: 'ai', label: 'Artificial Intelligence' },
  { id: 'nw', label: 'Network Engineering' },
  { id: 'is', label: 'Information Systems' },
];

const durations = ['3 months', '4 months', '5 months', '6 months'];

export default function CompanyInternships() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInternship, setEditingInternship] = useState<Internship | null>(null);
  const { toast } = useToast();
  const companyInternships = mockInternships.filter(i => i.company.id === 'c1');

  const form = useForm<InternshipFormData>({
    resolver: zodResolver(internshipSchema),
    defaultValues: {
      title: "",
      description: "",
      location: "",
      duration: "",
      seats: "",
      deadline: "",
      requirements: "",
      specializations: [],
    },
  });

  const handleEdit = (internship: Internship) => {
    setEditingInternship(internship);
    form.reset({
      title: internship.title,
      description: internship.description,
      location: internship.location,
      duration: internship.duration,
      seats: internship.seats.toString(),
      deadline: internship.deadline,
      requirements: internship.requirements.join(", "),
      specializations: internship.specializations.map(s => 
        specializations.find(sp => sp.label === s)?.id || s
      ),
    });
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingInternship(null);
    form.reset({
      title: "",
      description: "",
      location: "",
      duration: "",
      seats: "",
      deadline: "",
      requirements: "",
      specializations: [],
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: InternshipFormData) => {
    if (editingInternship) {
      toast({
        title: "Internship Updated",
        description: `"${data.title}" has been updated successfully.`,
      });
    } else {
      toast({
        title: "Internship Posted",
        description: `"${data.title}" has been posted successfully and is now visible to students.`,
      });
    }
    
    setIsDialogOpen(false);
    setEditingInternship(null);
    form.reset();
  };

  const handleDelete = (title: string) => {
    toast({
      title: "Internship Deleted",
      description: `"${title}" has been removed.`,
      variant: "destructive",
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <PageHeader
          title="Internship Postings"
          description="Create and manage internship opportunities"
          action={
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Post Internship
            </Button>
          }
        />

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingInternship ? "Edit Internship Posting" : "Create New Internship Posting"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Software Developer Intern" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe the role, responsibilities, and learning opportunities..."
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Kuala Lumpur" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select duration" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {durations.map((d) => (
                              <SelectItem key={d} value={d}>{d}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="seats"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number of Seats</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" placeholder="e.g., 5" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="deadline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Application Deadline</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="specializations"
                  render={() => (
                    <FormItem>
                      <FormLabel>Target Specializations</FormLabel>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {specializations.map((spec) => (
                          <FormField
                            key={spec.id}
                            control={form.control}
                            name="specializations"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(spec.id)}
                                    onCheckedChange={(checked) => {
                                      const newValue = checked
                                        ? [...field.value, spec.id]
                                        : field.value?.filter((value) => value !== spec.id);
                                      field.onChange(newValue);
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal cursor-pointer">
                                  {spec.label}
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="requirements"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Requirements</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="List required skills, qualifications, and any prerequisites..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingInternship ? "Update Internship" : "Post Internship"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Posted Internships
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Seats</TableHead>
                  <TableHead>Applications</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companyInternships.map((internship) => (
                  <TableRow key={internship.id}>
                    <TableCell className="font-medium">{internship.title}</TableCell>
                    <TableCell className="text-muted-foreground">{internship.seats}</TableCell>
                    <TableCell className="text-muted-foreground">{internship.applicationsCount}</TableCell>
                    <TableCell className="text-muted-foreground">{internship.deadline}</TableCell>
                    <TableCell>
                      <StatusBadge status={internship.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleEdit(internship)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(internship.title)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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