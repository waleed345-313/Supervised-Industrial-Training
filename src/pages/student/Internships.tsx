import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Search, MapPin, Clock, DollarSign, Building2, Users, Calendar, Upload, FileText, X, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Internship, Student } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import api from '@/lib/api';
import { mapInternshipFromApi } from '@/lib/internshipMap';
import { getApplicationDeadline } from '@/lib/api';

const applicationSchema = z.object({
  coverLetter: z.string().min(100, "Cover letter must be at least 100 characters").max(2000, "Cover letter must be less than 2000 characters"),
  whyInterested: z.string().min(50, "Please provide at least 50 characters").max(500, "Response must be less than 500 characters"),
  relevantExperience: z.string().min(30, "Please provide at least 30 characters").max(500, "Response must be less than 500 characters"),
});

type ApplicationFormData = z.infer<typeof applicationSchema>;

export default function StudentInternships() {
  const { user } = useAuth();
  const student = user as Student;
  const [searchQuery, setSearchQuery] = useState('');
  const [specializationFilter, setSpecializationFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedInternship, setSelectedInternship] = useState<Internship | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [internships, setInternships] = useState<Internship[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [globalDeadline, setGlobalDeadline] = useState<string>('');
  const { toast } = useToast();

  const applicationCount = applications.length;

  useEffect(() => {
    const fetchInternships = async () => {
      try {
        setIsLoading(true);
        // Pass student's gender to filter internships based on gender preference
        const raw = await api.getInternships({ 
          openOnly: true,
          studentGender: student?.gender 
        });
        let list: Internship[] = [];
        if (Array.isArray(raw)) {
          try {
            list = raw.map((r) => mapInternshipFromApi(r as Record<string, unknown>));
          } catch (mapErr) {
            console.error('Error mapping internships:', mapErr);
            list = [];
          }
        }
        setInternships(list);

        const deadlineRes = await getApplicationDeadline();
        setGlobalDeadline(String((deadlineRes as any)?.value || ''));
      } catch (error) {
        console.error('Error fetching internships:', error);
        toast({
          title: 'Error',
          description: 'Failed to load internships data.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchInternships();
  }, [toast, student?.gender]);

  const maxApplications = student?.maxApplications ?? 2;
  const canApply = applicationCount < maxApplications;
  const isAfterGlobalDeadline = (() => {
    if (!globalDeadline || globalDeadline === 'undefined') return false;
    const d = new Date(globalDeadline);
    if (isNaN(d.getTime())) return false;
    return Date.now() > d.getTime();
  })();

  const specializations = [...new Set(internships.flatMap(i => i.specializations || []))];
  const locations = [...new Set(internships.map(i => i.location).filter(Boolean))];

  const filteredInternships = internships.filter(internship => {
    const matchesSearch = internship.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      internship.company.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSpecialization = specializationFilter === 'all' || 
      internship.specializations.includes(specializationFilter);
    const matchesLocation = locationFilter === 'all' || internship.location === locationFilter;
    
    return matchesSearch && matchesSpecialization && matchesLocation;
  });

  const form = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      coverLetter: "",
      whyInterested: "",
      relevantExperience: "",
    },
  });

  const handleApplyClick = (internship: Internship) => {
    if (!canApply) {
      toast({
        title: "Application Limit Reached",
        description: `You can only apply for ${maxApplications} SIT opportunities per selection cycle.`,
        variant: "destructive",
      });
      return;
    }
    setSelectedInternship(internship);
    setIsDialogOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Resume must be less than 5MB",
          variant: "destructive",
        });
        return;
      }
      if (!['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF or Word document",
          variant: "destructive",
        });
        return;
      }
      setResumeFile(file);
    }
  };

  const onSubmit = async (data: ApplicationFormData) => {
    if (!resumeFile) {
      toast({
        title: "Resume required",
        description: "Please upload your resume to complete the application",
        variant: "destructive",
      });
      return;
    }

    if (!selectedInternship) return;
    if (!student?.id) {
      toast({ title: 'Session error', description: 'Please sign in again.', variant: 'destructive' });
      return;
    }

    const remarks = [
      `Resume (file name): ${resumeFile.name}`,
      `Cover letter:\n${data.coverLetter}`,
      `Why interested:\n${data.whyInterested}`,
      `Relevant experience:\n${data.relevantExperience}`,
    ].join('\n\n---\n\n');

    try {
      // Create application first
      const newApplication = await api.createApplication({
        studentId: student.id,
        studentName: student.name || 'Student',
        internshipId: selectedInternship.id,
        internshipTitle: selectedInternship.title,
        companyName: selectedInternship.company.name,
        remarks,
      });

      // Upload resume file if application was created successfully
      if (resumeFile && newApplication?.id) {
        const formData = new FormData();
        formData.append('file', resumeFile);
        formData.append('applicationId', newApplication.id);
        await api.uploadStudentResume(formData);
      }

      // Refresh applications to get the updated count
      const updatedApps = await api.getStudentApplications();
      setApplications(updatedApps || []);
      toast({
        title: 'Application Submitted',
        description: `Your application for ${selectedInternship.title} has been submitted. You have ${Math.max(0, maxApplications - applications.length - 1)} application(s) remaining.`,
      });
      setIsDialogOpen(false);
      setSelectedInternship(null);
      setResumeFile(null);
      form.reset();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not submit application.';
      toast({
        title: 'Application failed',
        description: message.replace(/^\[object Object\]$/, 'Please try again or check your application limit.'),
        variant: 'destructive',
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Browse SIT Opportunities"
          description="Explore available Supervised Industrial Training opportunities"
        />

        {/* Application Limit Alert */}
        <Alert variant={canApply ? "default" : "destructive"}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {canApply
              ? `You have applied to ${applicationCount} of ${maxApplications} allowed SIT opportunities. You can apply to ${maxApplications - applicationCount} more.`
              : `You have reached the maximum of ${maxApplications} applications for this SIT selection cycle.`
            }
          </AlertDescription>
        </Alert>

        {globalDeadline && (
          <Alert variant={isAfterGlobalDeadline ? "destructive" : "default"}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Applying deadline for this cycle: <span className="font-medium">{globalDeadline}</span>
              {isAfterGlobalDeadline ? ' (closed)' : ''}
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {isLoading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Loading internships...</p>
            </CardContent>
          </Card>
        ) : (
          <>
        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by title or company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={specializationFilter} onValueChange={setSpecializationFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Specialization" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Specializations</SelectItem>
                  {specializations.map((spec) => (
                    <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.map((loc) => (
                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="text-sm text-muted-foreground">
          Showing {filteredInternships.length} internship{filteredInternships.length !== 1 ? 's' : ''}
        </div>

        {/* Internship Cards */}
        <div className="grid gap-6">
          {filteredInternships.map((internship) => (
            <Card key={internship.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  {/* Left Section */}
                  <div className="flex gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-lg flex-shrink-0">
                      {internship.company?.name?.[0] || '?'}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-xl font-semibold">{internship.title}</h3>
                        <StatusBadge status={internship.status} />
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Building2 className="h-4 w-4" />
                        <span className="font-medium">{internship.company?.name || 'Unknown'}</span>
                        <span className="text-muted-foreground/50">•</span>
                        <span>{internship.company?.industry || ''}</span>
                      </div>
                      <p className="text-muted-foreground max-w-2xl">{internship.description}</p>
                      
                      {/* Tags */}
                      <div className="flex flex-wrap gap-2 pt-2">
                        {(internship.specializations || []).map((spec) => (
                          <Badge key={spec} variant="secondary">{spec}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Section */}
                  <div className="flex flex-col gap-4 lg:items-end lg:text-right flex-shrink-0">
                    <div className="grid grid-cols-2 gap-4 text-sm lg:flex lg:flex-col lg:gap-2">
                      <div className="flex items-center gap-2 lg:justify-end">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{internship.location}</span>
                      </div>
                      <div className="flex items-center gap-2 lg:justify-end">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{internship.duration}</span>
                      </div>
                      <div className="flex items-center gap-2 lg:justify-end">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{internship.seats} seats available</span>
                      </div>
                      {globalDeadline && (
                        <div className="flex items-center gap-2 lg:justify-end col-span-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>Deadline: {globalDeadline}</span>
                        </div>
                      )}
                    </div>
                    <Button 
                      className="w-full lg:w-auto"
                      disabled={internship.status !== 'open' || isAfterGlobalDeadline}
                      onClick={() => handleApplyClick(internship)}
                    >
                      {internship.status === 'open' && !isAfterGlobalDeadline ? 'Apply Now' : 'Closed'}
                    </Button>
                  </div>
                </div>

                {/* Requirements */}
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium mb-2">Requirements:</p>
                  <ul className="text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                    {/* Hard Requirements */}
                    {internship.cgpa && (
                      <li className="flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        CGPA: {internship.cgpa}
                      </li>
                    )}
                    {internship.gender && internship.gender !== 'Customized' && (
                      <li className="flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        Gender: {internship.gender}
                      </li>
                    )}
                    {internship.interview === 'Yes' && (
                      <li className="flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        Interview Required
                      </li>
                    )}
                    {(internship.requirements || []).map((req, index) => (
                      <li key={index} className="flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredInternships.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Search className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">No internships found</h3>
              <p className="text-muted-foreground">Try adjusting your search or filter criteria</p>
            </CardContent>
          </Card>
        )}

        {/* Application Form Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Apply for {selectedInternship?.title}</DialogTitle>
            </DialogHeader>
            
            {selectedInternship && (
              <div className="mb-4 p-4 bg-muted/50 rounded-lg">
                {student?.cnicNumber && (
                  <p className="text-sm text-muted-foreground mb-2">Your CNIC: {student.cnicNumber}</p>
                )}
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold">
                    {selectedInternship.company.name[0]}
                  </div>
                  <div>
                    <p className="font-medium">{selectedInternship.company.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedInternship.location} • {selectedInternship.duration}</p>
                  </div>
                </div>
              </div>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Resume Upload */}
                <div className="space-y-2">
                  <Label>Resume / CV *</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                    {resumeFile ? (
                      <div className="flex items-center justify-center gap-3">
                        <FileText className="h-8 w-8 text-primary" />
                        <div className="text-left">
                          <p className="font-medium">{resumeFile.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(resumeFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setResumeFile(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                        <p className="text-sm text-muted-foreground mb-2">
                          Drag and drop your resume or click to browse
                        </p>
                        <p className="text-xs text-muted-foreground mb-3">
                          PDF or Word document, max 5MB
                        </p>
                        <Input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={handleFileChange}
                          className="hidden"
                          id="resume-upload"
                        />
                        <Button type="button" variant="outline" asChild>
                          <label htmlFor="resume-upload" className="cursor-pointer">
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Resume
                          </label>
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="coverLetter"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cover Letter</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Introduce yourself and explain why you're a great fit for this position..."
                          className="min-h-[150px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="whyInterested"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Why are you interested in this internship?</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Share what excites you about this opportunity..."
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="relevantExperience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Relevant Experience or Projects</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe any relevant coursework, projects, or experience..."
                          className="min-h-[80px]"
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
                  <Button type="submit">Submit Application</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}