import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Briefcase, Plus, Eye, Pencil, Trash2 } from 'lucide-react';
import { Internship } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import api, { API_BASE } from '@/lib/api';
import { mapInternshipFromApi } from '@/lib/internshipMap';
import { io, type Socket } from 'socket.io-client';

const internshipSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(100, "Title must be less than 100 characters"),
  description: z.string().min(50, "Description must be at least 50 characters").max(1000, "Description must be less than 1000 characters"),
  duration: z.string().min(1, "Please select duration"),
  seats: z.string().min(1, "Number of seats is required").refine((val) => !isNaN(Number(val)) && Number(val) > 0, "Must be a positive number"),
  specializations: z.array(z.string()).min(1, "Select at least one specialization"),
  cgpa: z.enum(['3.5+', '3.0+', '2.5+', '2.0+']),
  gender: z.enum(['Male', 'Female', 'Customized']),
  interview: z.enum(['Yes', 'No']),
  status: z.enum(['open', 'closed', 'filled']),
});

type InternshipFormData = z.infer<typeof internshipSchema>;

const specializationOptions = [
  { id: 'cp', label: 'Computer Programming/ Software Development' },
  { id: 'db', label: 'Database Management/ Administration/ Programming' },
  { id: 'na', label: 'Network Administration/ Programming/ Management' },
  { id: 'wp', label: 'Web Programming/ Development/ E-Commerce' },
  { id: 'ai', label: 'Artificial intelligence/ Data Science/ Machine Learning' },
  { id: 'ip', label: 'Image Processing/ Game Programming/ Image Analysis' },
  { id: 'ma', label: 'Mobile App Development/ Programming/ Management/ Troubleshooting' },
  { id: 'cs', label: 'Cyber Security/ Digital Forensics/ Network Security' },
  { id: 'ux', label: 'User Interface/ User Experience Design/ Development' },
  { id: 'qa', label: 'Software Quality Assurance' },
  { id: 'hw', label: 'Hardware/ System Programming/ Computer Architecture/ OS' },
  { id: 'ot', label: 'Any other domain related to information engineering technology' },
];

const durations = ['16 weeks', '32 weeks'];

function specIdsToLabels(ids: string[]): string[] {
  return ids.map((id) => specializationOptions.find((s) => s.id === id)?.label || id);
}

function labelsToSpecIds(labels: string[]): string[] {
  return labels.map((label) => specializationOptions.find((s) => s.label === label)?.id || label);
}


export default function CompanyInternships() {
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInternship, setEditingInternship] = useState<Internship | null>(null);
  const [viewing, setViewing] = useState<Internship | null>(null);
  const [companyInternships, setCompanyInternships] = useState<Internship[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadInternships = useCallback(async () => {
    if (!user?.companyId) {
      setCompanyInternships([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const raw = await api.getInternshipsForMyCompany();
      const list = Array.isArray(raw) ? raw.map((r) => mapInternshipFromApi(r as Record<string, unknown>)) : [];
      setCompanyInternships(list);
    } catch (e) {
      console.error(e);
      toast({
        title: "Could not load internships",
        description: "Check that you are logged in as a company focal with a linked company.",
        variant: "destructive",
      });
      setCompanyInternships([]);
    } finally {
      setLoading(false);
    }
  }, [toast, user?.companyId]);

  useEffect(() => {
    loadInternships();
  }, [loadInternships]);

  useEffect(() => {
    const token = localStorage.getItem('sit_portal_token');
    if (!token || !user?.companyId) return;
    const socket: Socket = io(API_BASE, { auth: { token } });
    const onCompany = (payload: { type?: string }) => {
      if (payload?.type === 'internships') loadInternships();
    };
    socket.on('company:update', onCompany);
    return () => {
      socket.off('company:update', onCompany);
      socket.disconnect();
    };
  }, [user?.companyId, loadInternships]);

  const form = useForm<InternshipFormData>({
    resolver: zodResolver(internshipSchema),
    defaultValues: {
      title: "",
      description: "",
      duration: "",
      seats: "",
      specializations: [],
      cgpa: "3.0+",
      gender: "Customized",
      interview: "No",
      status: "open",
    },
  });

  const handleEdit = (internship: Internship) => {
    setEditingInternship(internship);
    form.reset({
      title: internship.title,
      description: internship.description,
      duration: internship.duration,
      seats: internship.seats.toString(),
      specializations: labelsToSpecIds(internship.specializations),
      cgpa: (internship.cgpa as any) || "3.0+",
      gender: (internship.gender as any) || "Customized",
      interview: (internship.interview as any) || "No",
      status: internship.status,
    });
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingInternship(null);
    form.reset({
      title: "",
      description: "",
      duration: "",
      seats: "",
      specializations: [],
      cgpa: "3.0+",
      gender: "Customized",
      interview: "No",
      status: "open",
    });
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: InternshipFormData) => {
    const payload = {
      title: data.title,
      description: data.description,
      duration: data.duration,
      seats: Number(data.seats),
      specializations: specIdsToLabels(data.specializations),
      cgpa: data.cgpa,
      gender: data.gender,
      interview: data.interview,
      status: data.status,
    };

    try {
      if (editingInternship) {
        await api.updateInternship(editingInternship.id, payload);
        toast({ title: "Internship updated", description: `"${data.title}" has been saved.` });
      } else {
        await api.createInternship(payload);
        toast({
          title: "Internship posted",
          description: `"${data.title}" is now visible to students (when status is open).`,
        });
      }
      setIsDialogOpen(false);
      setEditingInternship(null);
      form.reset();
      await loadInternships();
    } catch (e) {
      console.error(e);
      toast({ title: "Save failed", description: "Could not save internship on the server.", variant: "destructive" });
    }
  };

  const handleDelete = async (internship: Internship) => {
    if (!window.confirm(`Remove "${internship.title}"? This cannot be undone.`)) return;
    try {
      await api.deleteInternship(internship.id);
      toast({ title: "Removed", description: `"${internship.title}" was deleted.`, variant: "destructive" });
      await loadInternships();
    } catch (e) {
      console.error(e);
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <PageHeader
          title="Internship Postings"
          description="Create and manage internships stored for your company — open postings appear to students"
          action={
            <Button onClick={handleCreate} disabled={!user?.companyId}>
              <Plus className="h-4 w-4 mr-2" />
              Post Internship
            </Button>
          }
        />

        {!user?.companyId && (
          <p className="text-sm text-muted-foreground">
            Your account must be linked to a registered company to post internships. Ask an administrator to assign your company.
          </p>
        )}

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

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Listing status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="open">Open (visible to students)</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                            <SelectItem value="filled">Filled</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="specializations"
                  render={() => (
                    <FormItem>
                      <FormLabel>Target Specializations</FormLabel>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {specializationOptions.map((spec) => (
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

                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-foreground">Hard Requirements</h4>
                  <FormField
                    control={form.control}
                    name="cgpa"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel>CGPA Requirement</FormLabel>
                        <FormControl>
                          <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-wrap gap-4">
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="3.5+" />
                              </FormControl>
                              <FormLabel className="font-normal">3.5+</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="3.0+" />
                              </FormControl>
                              <FormLabel className="font-normal">3.0+</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="2.5+" />
                              </FormControl>
                              <FormLabel className="font-normal">2.5+</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="2.0+" />
                              </FormControl>
                              <FormLabel className="font-normal">More than 2.0</FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel>Gender Preference</FormLabel>
                        <FormControl>
                          <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-wrap gap-4">
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="Male" />
                              </FormControl>
                              <FormLabel className="font-normal">Male</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="Female" />
                              </FormControl>
                              <FormLabel className="font-normal">Female</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="Customized" />
                              </FormControl>
                              <FormLabel className="font-normal">Customized (both can apply)</FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="interview"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel>Interview Required</FormLabel>
                        <FormControl>
                          <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-wrap gap-4">
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="Yes" />
                              </FormControl>
                              <FormLabel className="font-normal">Yes</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="No" />
                              </FormControl>
                              <FormLabel className="font-normal">No</FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

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

        <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{viewing?.title}</DialogTitle>
            </DialogHeader>
            {viewing && (
              <div className="space-y-2 text-sm text-muted-foreground">
                <p><span className="font-medium text-foreground">Location:</span> {viewing.location} (from company)</p>
                <p><span className="font-medium text-foreground">Duration:</span> {viewing.duration}</p>
                <p><span className="font-medium text-foreground">Seats:</span> {viewing.seats}</p>
                <p className="pt-2">{viewing.description}</p>
              </div>
            )}
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
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                  <TableHead>Seats</TableHead>
                  <TableHead>Filled / Total</TableHead>
                  <TableHead>Applications</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companyInternships.map((internship) => (
                    <TableRow key={internship.id}>
                      <TableCell className="font-medium">{internship.title}</TableCell>
                      <TableCell className="text-muted-foreground">{internship.seats}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {internship.seatsFilled ?? 0} / {internship.seats}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{internship.applicationsCount}</TableCell>
                      <TableCell>
                        <StatusBadge status={internship.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" type="button" onClick={() => setViewing(internship)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" type="button" onClick={() => handleEdit(internship)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(internship)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {!loading && companyInternships.length === 0 && user?.companyId && (
              <p className="text-sm text-muted-foreground py-4">No postings yet. Use Post Internship to add one.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
