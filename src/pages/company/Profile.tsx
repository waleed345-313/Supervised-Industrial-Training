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
import { User, Mail } from 'lucide-react';
import { useChangePassword } from '@/hooks/use-change-password';
import { ChangePasswordFields } from '@/components/profile/ChangePasswordFields';
import api from '@/lib/api';

export default function CompanyFocalProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const password = useChangePassword();

  const handleSave = async () => {
    if (!user) return;
    const pwOk = await password.submitPasswordChange();
    if (!pwOk) return;

    try {
      const firstName = (document.getElementById('firstName') as HTMLInputElement)?.value?.trim();
      const lastName = (document.getElementById('lastName') as HTMLInputElement)?.value?.trim();
      const email = (document.getElementById('email') as HTMLInputElement)?.value?.trim();
      const name = [firstName, lastName].filter(Boolean).join(' ').trim() || user.name;

      await api.updateUser(user.id, { name, email });

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
                <p className="text-sm text-muted-foreground mt-1">Company Focal Person</p>
                {user.department && (
                  <p className="text-sm text-muted-foreground">{user.department}</p>
                )}
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
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="firstName"
                      defaultValue={user.name.split(' ')[0]}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="lastName"
                      defaultValue={user.name.split(' ')[1] || ''}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    defaultValue={user.email}
                    className="pl-10"
                  />
                </div>
              </div>

              <ChangePasswordFields {...password} />

              <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={password.resetPasswordFields}>Cancel</Button>
                <Button type="button" onClick={handleSave}>Save Changes</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}