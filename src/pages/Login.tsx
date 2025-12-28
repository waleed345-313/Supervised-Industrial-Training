import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { UserRole } from '@/types';
import { roleLabels } from '@/data/mockData';
import { GraduationCap, Building2, Users } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .regex(/^[a-zA-Z0-9.]+@gmail\.com$/, 'Email must be a valid Gmail address (dots allowed in username, but must end exactly with @gmail.com)')
    .max(254, 'Email must be less than 254 characters'),
  password: z.string().min(1, 'Password is required').min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const { login, loginAsRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    
    const success = await login(data.email, data.password);
    
    if (success) {
      toast({ title: 'Welcome back!', description: 'You have successfully logged in.' });
      navigate('/dashboard');
      form.reset();
    } else {
      toast({ 
        title: 'Login failed', 
        description: 'Invalid email or password.',
        variant: 'destructive'
      });
    }
    
    setIsLoading(false);
  };

  const handleQuickLogin = (role: UserRole) => {
    loginAsRole(role);
    toast({ title: 'Quick Login', description: `Logged in as ${roleLabels[role]}` });
    navigate('/dashboard');
  };

  const roles: { role: UserRole; label: string; icon: React.ReactNode }[] = [
    { role: 'admin', label: 'Administrator', icon: <Users className="h-4 w-4" /> },
    { role: 'manager_placements', label: 'Manager Placements', icon: <Building2 className="h-4 w-4" /> },
    { role: 'university_focal', label: 'University Focal Person', icon: <Building2 className="h-4 w-4" /> },
    { role: 'academic_supervisor', label: 'Academic Supervisor', icon: <GraduationCap className="h-4 w-4" /> },
    { role: 'industrial_supervisor', label: 'Industrial Supervisor', icon: <Building2 className="h-4 w-4" /> },
    { role: 'company_focal', label: 'Company Focal Person', icon: <Building2 className="h-4 w-4" /> },
    { role: 'evaluation_panel', label: 'Evaluation Panel', icon: <GraduationCap className="h-4 w-4" /> },
    { role: 'student', label: 'Student', icon: <GraduationCap className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        {/* Logo and Title */}
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-2xl shadow-lg">
            SIT
          </div>
          <h1 className="mt-6 text-3xl font-bold tracking-tight">SIT Portal</h1>
          <p className="mt-2 text-muted-foreground">Supervised Industrial Training Management System</p>
        </div>

        {/* Login Card */}
        <Card className="shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Sign in</CardTitle>
            <CardDescription>Enter your credentials to access the portal</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="youremail@gmail.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Signing in...' : 'Sign in'}
                </Button>
              </form>
            </Form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Demo Quick Access</span>
              </div>
            </div>

            {/* Quick Login Buttons */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Select a role to demo:</Label>
              <Select onValueChange={(value) => handleQuickLogin(value as UserRole)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a role..." />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.role} value={r.role}>
                      <div className="flex items-center gap-2">
                        {r.icon}
                        <span>{r.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          © 2024 University Industrial Training Program
        </p>
      </div>
    </div>
  );
}
