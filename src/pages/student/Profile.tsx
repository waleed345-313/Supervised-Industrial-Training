import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { Student } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { User, Mail, GraduationCap, BookOpen, Lock } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { getStudentApplications, getStudentDocuments } from '@/lib/api';
import type { Document as StoredDocument } from '@/types';

/** Primary badge under student name: mirrors company-uploaded letters (acceptance → allocated SIT-I; completion SIT 1 → SIT-II; completion SIT II → Completed SIT). Uses uploaded document types when sitPhase wasn’t synced. */
function specializationOrSitBadge(
  student: Student | undefined,
  opts?: {
    hasAllocatedApplication?: boolean;
    hasSit1CompletionLetter?: boolean;
    hasSit2OrLegacyCompletionLetter?: boolean;
  },
): { label: string; title: string } {
  if (!student) {
    return { label: 'Specialization not set', title: '' };
  }

  if (
    student.currentStatus === 'completed' ||
    opts?.hasSit2OrLegacyCompletionLetter
  ) {
    return {
      label: 'Completed SIT',
      title:
        'Company has uploaded the completion letter for SIT II (or a full-programme completion letter). Your supervised training with the host organisation is marked complete.',
    };
  }

  const treatAsAllocated =
    student.currentStatus === 'allocated' ||
    Boolean(opts?.hasAllocatedApplication && student.currentStatus !== 'completed');

  const uploadedSit1CompletesFirstBlock = Boolean(opts?.hasSit1CompletionLetter);
  const inSecondSegment = student.sitPhase === 'sit_2' || uploadedSit1CompletesFirstBlock;

  if (treatAsAllocated || uploadedSit1CompletesFirstBlock) {
    if (inSecondSegment) {
      return {
        label: 'SIT-II',
        title:
          'Company uploaded the completion letter for SIT I. You are in the second 16-week block with the same host employer.',
      };
    }
    return {
      label: 'SIT-I',
      title:
        'Company has uploaded your acceptance letter for SIT I (you are allocated). This updates to SIT-II when the completion letter for SIT I is uploaded.',
    };
  }
  const spec = student.specialization?.trim();
  return {
    label: spec || 'Specialization not set',
    title: spec ? '' : 'Set your specialization with the university when not yet in an allocated placement.',
  };
}

export default function StudentProfile() {
  const { user, refreshSessionUser, initialSessionResolved } = useAuth();
  const student = user as Student;
  const { toast } = useToast();
  const [appHasAllocated, setAppHasAllocated] = useState(false);
  const [docHints, setDocHints] = useState({
    hasSit1CompletionLetter: false,
    hasSit2OrLegacyCompletionLetter: false,
  });

  useEffect(() => {
    if (!initialSessionResolved || user?.role !== 'student') return;
    let cancelled = false;

    void (async () => {
      await refreshSessionUser();
      try {
        const apps = await getStudentApplications();
        if (!cancelled && Array.isArray(apps)) {
          setAppHasAllocated(apps.some((a) => String(a.status) === 'allocated'));
        }

        try {
          const docs = (await getStudentDocuments()) as StoredDocument[];
          if (!cancelled && Array.isArray(docs)) {
            const types = docs.map((d) => d.type);
            setDocHints({
              hasSit1CompletionLetter: types.includes('completion_sit_1'),
              hasSit2OrLegacyCompletionLetter:
                types.includes('completion_sit_2') || types.includes('completion_letter'),
            });
          }
        } catch {
          if (!cancelled) setDocHints({ hasSit1CompletionLetter: false, hasSit2OrLegacyCompletionLetter: false });
        }
      } catch {
        if (!cancelled) setAppHasAllocated(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    initialSessionResolved,
    user?.role,
    user?.id,
    refreshSessionUser,
    student?.sitPhase,
    student?.currentStatus,
  ]);

  const displayName = student?.name?.trim() || '';
  const nameParts = displayName.split(/\s+/).filter(Boolean);
  const defaultFirst = nameParts[0] || '';
  const defaultLast = nameParts.slice(1).join(' ') || '';
  const cgpaDisplay =
    typeof student?.cgpa === 'number' && !Number.isNaN(student.cgpa) ? student.cgpa.toFixed(2) : '—';
  const avatarLetters = nameParts.map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'S';
  const progBadge = useMemo(
    () =>
      specializationOrSitBadge(student, {
        hasAllocatedApplication: appHasAllocated,
        hasSit1CompletionLetter: docHints.hasSit1CompletionLetter,
        hasSit2OrLegacyCompletionLetter: docHints.hasSit2OrLegacyCompletionLetter,
      }),
    [
      student,
      appHasAllocated,
      docHints.hasSit1CompletionLetter,
      docHints.hasSit2OrLegacyCompletionLetter,
      student?.currentStatus,
      student?.sitPhase,
    ],
  );

  // validation schema for profile form
  const profileSchema = z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Invalid email address'),
    cnicNumber: z
      .string()
      .optional()
      .refine(
        (val) => !val || /^\d{5}-\d{7}-\d$/.test(val),
        {
          message: 'CNIC must be in format 12345-1234567-1',
        }
      ),
  });
  type ProfileFormData = z.infer<typeof profileSchema>;

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: defaultFirst,
      lastName: defaultLast,
      email: student?.email || '',
      cnicNumber: student?.cnicNumber || '',
    },
  });

  const handleSave = (data: ProfileFormData) => {
    toast({
      title: 'Profile Updated',
      description: 'Your profile changes have been saved successfully.',
    });
    console.log('form data', data);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="My Profile"
          description="View and manage your personal information"
        />

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Profile Card */}
          <Card className="lg:col-span-1">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <Avatar className="h-24 w-24 mb-4">
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                    {avatarLetters}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-semibold">{displayName || 'Student'}</h2>
                <p className="text-muted-foreground">{student?.studentId ?? '—'}</p>
                {student?.cnicNumber && (
                  <p className="text-sm text-muted-foreground mt-1">CNIC: {student.cnicNumber}</p>
                )}
                <Badge
                  className="mt-2"
                  variant="secondary"
                  title={progBadge.title || undefined}
                >
                  {progBadge.label}
                </Badge>
                
                <Separator className="my-6" />
                
                <div className="w-full space-y-4 text-left">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <GraduationCap className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">CGPA</p>
                      <p className="font-semibold">{cgpaDisplay}</p>
                    </div>
                    <Lock className="h-4 w-4 text-muted-foreground ml-auto" />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Department</p>
                      <p className="font-semibold">IT</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Edit Form */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your contact details and preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <FormControl>
                              <Input className="pl-10" {...field} />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <FormControl>
                              <Input className="pl-10" {...field} />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <FormControl>
                            <Input type="email" className="pl-10" {...field} />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Separator />

                  <FormField
                    control={form.control}
                    name="cnicNumber"
                    render={({ field }) => (
                      <FormItem className="max-w-md">
                        <FormLabel>CNIC Number</FormLabel>
                        <FormControl>
                          <Input placeholder="12345-1234567-1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Change Password</h3>
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="currentPassword"
                          type="password"
                          className="pl-10"
                          placeholder="Enter current password"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="newPassword"
                          type="password"
                          className="pl-10"
                          placeholder="Enter new password"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="confirmPassword"
                          type="password"
                          className="pl-10"
                          placeholder="Confirm new password"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-4">
                    <Button variant="outline" type="button" onClick={() => form.reset()}>
                      Cancel
                    </Button>
                    <Button type="submit">Save Changes</Button>
                  </div>
                </form>
              </Form>

              {/* readonly student info and actions could go here if needed */}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
