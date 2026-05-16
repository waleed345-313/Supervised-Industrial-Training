import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { User, Mail, Lock } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import api from '@/lib/api';

export default function IndustrialSupervisorProfile() {
  const { user } = useAuth();
  const { toast } = useToast();

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
      firstName: user?.name.split(' ')[0] || '',
      lastName: user?.name.split(' ')[1] || '',
      email: user?.email || '',
      cnicNumber: user?.cnicNumber || '',
    },
  });

  const handleSave = async (data: ProfileFormData) => {
    if (!user) return;

    try {
      const updatedName = `${data.firstName} ${data.lastName}`.trim();

      await api.updateUser(user.id, {
        name: updatedName,
        email: data.email,
        cnicNumber: data.cnicNumber,
      });

      toast({
        title: 'Profile Updated',
        description: 'Your profile changes have been saved successfully.',
      });
    } catch (error) {
      console.error('Error updating profile', error);
      toast({
        title: 'Update Failed',
        description: 'There was a problem saving your changes. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (!user) return null;

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
                    {user.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-semibold">{user.name}</h2>
                <p className="text-muted-foreground">{user.email}</p>
                {(form.watch('cnicNumber') || user.cnicNumber) && (
                  <p className="text-sm text-muted-foreground mt-1">
                    CNIC: {form.watch('cnicNumber') || user.cnicNumber}
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-1">Industrial Supervisor</p>
                <p className="text-sm text-muted-foreground">IT</p>
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

                  <FormField
                    control={form.control}
                    name="cnicNumber"
                    render={({ field }) => (
                      <FormItem>
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
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}