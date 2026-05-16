import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { roleLabels } from '@/data/mockData';
import api from '@/lib/api';
import { Users, Plus, Pencil, Trash2, ChevronDown, ChevronRight, Download } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { User, UserRole, Student } from '@/types';

const userFormSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Enter a valid email address')
    .max(254, 'Email must be less than 254 characters')
    .transform((val) => val.toLowerCase()),
  role: z.enum(['manager_placements', 'university_focal', 'academic_supervisor', 'industrial_supervisor', 'company_focal', 'evaluation_panel', 'student']),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be less than 50 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
    department: z.string()
    .max(100, 'Department must be less than 100 characters')
    .optional()
    .or(z.literal('')),
  registrationNo: z.string().max(50, 'Registration number must be less than 50 characters').optional().or(z.literal('')),
  cgpa: z.string().optional().or(z.literal('')),
  batch: z.string().max(10, 'Batch must be less than 10 characters').optional().or(z.literal('')),
  section: z.string().max(3, 'Section must be less than 3 characters').optional().or(z.literal('')),
  companyId: z.string().optional().or(z.literal('')),
  gender: z.enum(['Male', 'Female', 'Other']).optional(),
}).superRefine((data, ctx) => {
  if (
    (data.role === 'company_focal' || data.role === 'industrial_supervisor') &&
    (!data.companyId || !String(data.companyId).trim())
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Select a registered company for this role',
      path: ['companyId'],
    });
  }
});

type UserFormData = z.infer<typeof userFormSchema>;

type RegisteredCompanyOption = { id: string; name: string };

const STORAGE_KEY = 'sit_portal_users';

// Load users from localStorage as fallback
const loadUsers = (): (User | Student)[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading users from localStorage:', error);
  }
  return [];
};

// Generate default password for users without passwords
const generateDefaultPassword = (user: User | Student): string => {
  if (user.password && user.password !== 'N/A') return user.password;
  
  // Generate a default password based on user info
  const namePart = user.name.split(' ')[0].toLowerCase();
  const emailPart = user.email.split('@')[0];
  const randomSuffix = Math.floor(Math.random() * 1000);
  return `${namePart}${emailPart}${randomSuffix}`;
};

// Save users to localStorage
const saveUsers = (users: (User | Student)[]) => {
  try {
    // Ensure passwords are included when saving
    const usersWithPasswords = users.map(user => ({
      ...user,
      password: generateDefaultPassword(user)
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(usersWithPasswords));
  } catch (error) {
    console.error('Error saving users to localStorage:', error);
  }
};

export default function AdminUsers() {
  const [allUsers, setAllUsers] = useState<(User | Student)[]>(() => loadUsers());
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<(User | Student) | null>(null);
  const [expandedRoles, setExpandedRoles] = useState<Set<UserRole>>(new Set());
  const [registeredCompanies, setRegisteredCompanies] = useState<RegisteredCompanyOption[]>([]);
  const [exportRole, setExportRole] = useState<string>('all');
  const [exportBatch, setExportBatch] = useState<string>('all');
  const [exportCompany, setExportCompany] = useState<string>('all');
  const [exportAttributes, setExportAttributes] = useState({
    email: true,
    password: true,
    name: true,
    role: true,
    batch: false,
    registrationNo: false,
    company: false,
  });
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await api.getCompanies();
        if (cancelled || !Array.isArray(raw)) return;
        setRegisteredCompanies(
          raw.map((c: { _id?: string; id?: string; name: string }) => ({
            id: String(c._id ?? c.id),
            name: c.name,
          }))
        );
      } catch {
        if (!cancelled) setRegisteredCompanies([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // On mount load users from backend, fallback to localStorage
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const users = await api.getUsers();
        if (!cancelled) {
          // Preserve locally stored passwords when fetching from backend
          const localUsers = loadUsers();
          const usersWithPasswords = users.map(backendUser => {
            const localUser = localUsers.find(u => u.id === backendUser.id);
            const existingPassword = localUser?.password || backendUser.password;
            return {
              ...backendUser,
              password: existingPassword && existingPassword !== 'N/A' ? existingPassword : generateDefaultPassword(backendUser)
            };
          });
          setAllUsers(usersWithPasswords);
        }
      } catch (err) {
        console.warn('Could not fetch users from backend, using local store');
        const fallback = loadUsers();
        if (!cancelled) setAllUsers(fallback);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Save to localStorage whenever users change
  useEffect(() => {
    saveUsers(allUsers);
  }, [allUsers]);

  // Reset batch/company filters when export role changes
  useEffect(() => {
    setExportBatch('all');
    setExportCompany('all');
  }, [exportRole]);

  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: '',
      email: '',
      role: 'student',
      username: '',
      department: '',
      registrationNo: '',
      cgpa: '',
      batch: '',
      section: '',
      companyId: '',
      gender: undefined,
    },
  });

  const watchedRole = form.watch('role');
  const showStudentFields = (selectedUser && selectedUser.role === 'student') || form.getValues('role') === 'student';
  const showCompanyScopedFields =
    watchedRole === 'company_focal' || watchedRole === 'industrial_supervisor';

  const companyLabelForUser = (u: User | Student) => {
    if (!u.companyId) return '—';
    return registeredCompanies.find((c) => c.id === u.companyId)?.name ?? u.companyId;
  };
  const validRoles = ['manager_placements', 'university_focal', 'academic_supervisor', 'industrial_supervisor', 'company_focal', 'evaluation_panel', 'student'] as const;

  const handleAddClick = () => {
    form.reset({
      role: 'student',
      name: '',
      email: '',
      username: '',
      department: '',
      registrationNo: '',
      cgpa: '',
      batch: '',
      section: '',
      companyId: '',
      gender: undefined,
    });
    setIsAddDialogOpen(true);
  };

  const handleEditClick = (user: User | Student) => {
    setSelectedUser(user);
    const roleValue = (validRoles as readonly string[]).includes(user.role as unknown as string)
      ? (user.role as unknown as UserFormData['role'])
      : 'student';
    form.reset({
      name: user.name,
      email: user.email,
      role: roleValue,
      username: user.username || '',
      department: user.department || '',
      registrationNo: (user as Student).studentId || '',
      cgpa: (typeof (user as Student).cgpa === 'number' ? String((user as Student).cgpa) : ''),
      batch: ((user as Student & { batch?: string }).batch) || '',
      section: ((user as Student & { section?: string }).section) || '',
      companyId: (user as User).companyId || '',
      gender: ((user as Student & { gender?: 'Male' | 'Female' | 'Other' }).gender) || undefined,
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (user: User | Student) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const toggleRoleExpansion = (role: UserRole) => {
    setExpandedRoles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(role)) {
        newSet.delete(role);
      } else {
        newSet.add(role);
      }
      return newSet;
    });
  };

  // Group users by role
  const usersByRole = allUsers.reduce((acc, user) => {
    if (!acc[user.role]) {
      acc[user.role] = [];
    }
    acc[user.role].push(user);
    return acc;
  }, {} as Record<UserRole, (User | Student)[]>);

  const onSubmit = async (data: UserFormData) => {
    if (selectedUser && isEditDialogOpen) {
      // Edit existing user - validate email and username uniqueness (excluding current user)
      const emailExists = allUsers.some(
        u => u.id !== selectedUser.id && u.email.toLowerCase() === data.email.toLowerCase()
      );
      const usernameExists = allUsers.some(
        u => u.id !== selectedUser.id && (u as User).username && (u as User).username?.toLowerCase() === data.username.toLowerCase()
      );

      if (emailExists) {
        form.setError('email', {
          type: 'manual',
          message: 'Email already exists',
        });
        return;
      }

      if (usernameExists) {
        form.setError('username', {
          type: 'manual',
          message: 'Username already exists',
        });
        return;
      }

      try {
        const updated = await api.updateUser(selectedUser.id, {
          name: data.name,
          email: data.email,
          role: data.role,
          username: data.username,
          department: data.department || 'IT',
          // student fields
          studentId: data.registrationNo,
          cgpa: data.cgpa ? parseFloat(data.cgpa) : undefined,
          batch: data.batch || undefined,
          section: data.section || undefined,
          gender: data.gender || undefined,
          companyId:
            data.role === 'company_focal' || data.role === 'industrial_supervisor'
              ? data.companyId
              : null,
        });
        setAllUsers(prev => prev.map(u => u.id === selectedUser.id ? updated : u));
      } catch (err) {
        console.error('Failed to update user:', err);
        toast({ title: 'Update failed', description: 'Could not update user on backend.' });
        return;
      }
      toast({
        title: 'User Updated',
        description: `${data.name} has been updated successfully.`,
      });
      setIsEditDialogOpen(false);
      setSelectedUser(null);
    } else {
      // Add new user - validate email and username uniqueness
      const emailExists = allUsers.some(
        u => u.email.toLowerCase() === data.email.toLowerCase()
      );
      const usernameExists = allUsers.some(
        u => (u as User).username && (u as User).username?.toLowerCase() === data.username.toLowerCase()
      );

      if (emailExists) {
        form.setError('email', {
          type: 'manual',
          message: 'Email already exists',
        });
        return;
      }

      if (usernameExists) {
        form.setError('username', {
          type: 'manual',
          message: 'Username already exists',
        });
        return;
      }

      // Generate automatic password for new user
      const tempUser: User = {
        id: Date.now().toString(),
        name: data.name,
        email: data.email,
        role: data.role,
        department: data.department,
        username: data.username,
      };
      const generatedPassword = generateDefaultPassword(tempUser);

      try {
        const res = await api.createUser({
          name: data.name,
          email: data.email,
          password: generatedPassword,
          role: data.role,
          department: data.department || 'IT',
          username: data.username || undefined,
          companyId:
            data.role === 'company_focal' || data.role === 'industrial_supervisor'
              ? data.companyId || undefined
              : undefined,
          // student fields stored on User
          studentId: data.role === 'student' ? (data.registrationNo || undefined) : undefined,
          cgpa: data.role === 'student' && data.cgpa ? parseFloat(data.cgpa) : undefined,
          batch: data.role === 'student' ? (data.batch || undefined) : undefined,
          section: data.role === 'student' ? (data.section || undefined) : undefined,
          gender: data.role === 'student' ? (data.gender || undefined) : undefined,
        });
        // auth.register returns { token, user }
        const createdUser = res.user || res;
        // Store generated password locally for export purposes
        const userWithPassword = { ...createdUser, password: generatedPassword };
        setAllUsers(prev => [...prev, userWithPassword]);
      } catch (err) {
        console.error('Failed to create user:', err);
        form.setError('email', { type: 'manual', message: 'Could not create user (maybe email exists)' });
        return;
      }
      toast({
        title: 'User Added',
        description: `${data.name} has been added successfully with auto-generated password.`,
      });
      setIsAddDialogOpen(false);
    }
    form.reset();
  };

  const handleDelete = () => {
    if (selectedUser) {
      (async () => {
        try {
          await api.deleteUser(selectedUser.id);
          setAllUsers(prev => prev.filter(user => user.id !== selectedUser.id));
          toast({ title: 'User Deleted', description: `${selectedUser.name} has been deleted successfully.` });
        } catch (err) {
          console.error('Delete failed:', err);
          toast({ title: 'Delete failed', description: 'Could not delete user on backend.', variant: 'destructive' });
        }
      })();
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
    }
  };

  const handleExport = async () => {
    // Filter users based on selected role, batch, and company
    let filteredUsers = exportRole === 'all' 
      ? allUsers 
      : allUsers.filter(user => user.role === exportRole);

    // Apply batch filter for students
    if (exportRole === 'student' && exportBatch !== 'all') {
      filteredUsers = filteredUsers.filter(user => (user as any).batch === exportBatch);
    }

    // Apply company filter for industrial supervisors and company focals
    if ((exportRole === 'industrial_supervisor' || exportRole === 'company_focal') && exportCompany !== 'all') {
      filteredUsers = filteredUsers.filter(user => user.companyId === exportCompany);
    }

    if (filteredUsers.length === 0) {
      toast({ title: 'No Data', description: 'No users found for the selected criteria.', variant: 'destructive' });
      return;
    }

    // Generate and update passwords for all users being exported
    const usersWithPasswords = filteredUsers.map(user => {
      const password = user.password && user.password !== 'N/A' ? user.password : generateDefaultPassword(user);
      return { ...user, password };
    });

    // Update passwords in backend for all users
    try {
      await Promise.all(usersWithPasswords.map(async (user) => {
        await api.updateUser(user.id, { password: user.password });
      }));
      
      // Update local state with new passwords
      setAllUsers(prev => 
        prev.map(user => {
          const updatedUser = usersWithPasswords.find(u => u.id === user.id);
          return updatedUser || user;
        })
      );

      toast({ 
        title: 'Passwords Updated', 
        description: `Generated and saved passwords for ${usersWithPasswords.length} users.` 
      });
    } catch (error) {
      console.error('Failed to update passwords in backend:', error);
      toast({ 
        title: 'Update Failed', 
        description: 'Failed to save some passwords to backend. Exporting with local passwords.',
        variant: 'destructive'
      });
    }

    // Prepare data for export
    const exportData = usersWithPasswords.map(user => {
      const row: any = {};
      
      if (exportAttributes.name) row.Name = user.name;
      if (exportAttributes.email) row.Email = user.email;
      if (exportAttributes.password) row.Password = user.password;
      if (exportAttributes.role) row.Role = roleLabels[user.role] || user.role;
      
      // Include batch and registration number for students, regardless of export role
      if (user.role === 'student') {
        if (exportAttributes.batch) row.Batch = (user as any).batch || 'N/A';
        if (exportAttributes.registrationNo) row['Registration No.'] = (user as any).studentId || (user as any).registrationNo || 'N/A';
      }
      
      // Include company information for Industrial Supervisor and Company Focal Person
      if (user.role === 'industrial_supervisor' || user.role === 'company_focal') {
        if (exportAttributes.company) row.Company = companyLabelForUser(user) || 'N/A';
      }
      
      return row;
    });

    // Convert to CSV and download
    const headers = Object.keys(exportData[0]);
    const csvContent = [
      headers.join(','),
      ...exportData.map(row => headers.map(header => {
        const value = row[header];
        // Escape commas and quotes in values
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `users_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ 
      title: 'Export Successful', 
      description: `Exported ${exportData.length} users to CSV file with passwords.` 
    });
    setIsExportDialogOpen(false);
  };

  const handleAttributeChange = (attribute: string, checked: boolean) => {
    setExportAttributes(prev => ({
      ...prev,
      [attribute]: checked
    }));
  };

  const handleRegeneratePasswords = () => {
    const usersWithNewPasswords = allUsers.map(user => ({
      ...user,
      password: generateDefaultPassword(user)
    }));
    setAllUsers(usersWithNewPasswords);
    toast({ 
      title: 'Passwords Regenerated', 
      description: `Generated new passwords for ${usersWithNewPasswords.length} users.` 
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <PageHeader
          title="User Management"
          description="Manage all system users"
          action={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsExportDialogOpen(true)}>
                <Download className="h-4 w-4 mr-2" />
                Export Users
              </Button>
              <Button onClick={handleAddClick}>
                <Plus className="h-4 w-4 mr-2" />
                Add User 
              </Button>
            </div>
          }
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Management by Role
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(usersByRole).filter(([role]) => role !== 'admin').map(([role, users]) => (
              <Collapsible
                key={role}
                open={expandedRoles.has(role as UserRole)}
                onOpenChange={() => toggleRoleExpansion(role as UserRole)}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between p-4 h-auto"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{roleLabels[role as UserRole]}</span>
                      <Badge variant="secondary">{users.length} user{users.length !== 1 ? 's' : ''}</Badge>
                    </div>
                    {expandedRoles.has(role as UserRole) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Username</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Company</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user) => (
                          <TableRow key={user.id} className="role-management-hover">
                            <TableCell className="font-medium">{user.name}</TableCell>
                            <TableCell className="text-muted-foreground">{user.email}</TableCell>
                            <TableCell className="text-muted-foreground">{user.username || '-'}</TableCell>
                            <TableCell className="text-muted-foreground">{user.department || '-'}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {user.role === 'company_focal' || user.role === 'industrial_supervisor'
                                ? companyLabelForUser(user)
                                : '—'}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => handleEditClick(user)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => handleDeleteClick(user)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </CardContent>
        </Card>

        {/* Add User Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="manager_placements">Manager Placements</SelectItem>
                          <SelectItem value="university_focal">University Focal Person</SelectItem>
                          <SelectItem value="academic_supervisor">Academic Supervisor</SelectItem>
                          <SelectItem value="industrial_supervisor">Industrial Supervisor</SelectItem>
                          <SelectItem value="company_focal">Company Focal Person</SelectItem>
                          <SelectItem value="evaluation_panel">Evaluation Panel Member</SelectItem>
                          <SelectItem value="student">Student</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Enter email address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter username" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                
                <FormField
                  control={form.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="IT">IT</SelectItem>
                          <SelectItem value="Computer Science">Computer Science</SelectItem>
                          <SelectItem value="Electrical">Electrical</SelectItem>
                          <SelectItem value="Mechanical">Mechanical</SelectItem>
                          <SelectItem value="Civil">Civil</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {watchedRole === 'student' && (
                  <>
                    <FormField
                      control={form.control}
                      name="registrationNo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Registration No</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter registration number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="cgpa"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CGPA</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="e.g. 3.50" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="batch"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Batch</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. FA23" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="section"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Section</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. A" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gender</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || undefined}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select gender" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Male">Male</SelectItem>
                              <SelectItem value="Female">Female</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {showCompanyScopedFields && (
                  <FormField
                    control={form.control}
                    name="companyId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Registered company</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || undefined}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue
                                placeholder={
                                  registeredCompanies.length
                                    ? 'Select company from registry'
                                    : 'No companies registered yet'
                                }
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {registeredCompanies.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Add User</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Enter email address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter username" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="manager_placements">Manager Placements</SelectItem>
                          <SelectItem value="university_focal">University Focal Person</SelectItem>
                          <SelectItem value="academic_supervisor">Academic Supervisor</SelectItem>
                          <SelectItem value="industrial_supervisor">Industrial Supervisor</SelectItem>
                          <SelectItem value="company_focal">Company Focal Person</SelectItem>
                          <SelectItem value="evaluation_panel">Evaluation Panel Member</SelectItem>
                          <SelectItem value="student">Student</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="IT">IT</SelectItem>
                          <SelectItem value="Computer Science">Computer Science</SelectItem>
                          <SelectItem value="Electrical">Electrical</SelectItem>
                          <SelectItem value="Mechanical">Mechanical</SelectItem>
                          <SelectItem value="Civil">Civil</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {showStudentFields && (
                  <>
                    <FormField
                      control={form.control}
                      name="registrationNo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Registration No</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter registration number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="cgpa"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CGPA</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="e.g. 3.50" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="batch"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Batch</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. FA23" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="section"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Section</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. A" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gender</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || undefined}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select gender" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Male">Male</SelectItem>
                              <SelectItem value="Female">Female</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {showCompanyScopedFields && (
                  <FormField
                    control={form.control}
                    name="companyId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Registered company</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || undefined}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue
                                placeholder={
                                  registeredCompanies.length
                                    ? 'Select company from registry'
                                    : 'No companies registered yet'
                                }
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {registeredCompanies.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Update User</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the user{' '}
                <strong>{selectedUser?.name}</strong> and all associated data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Export Dialog */}
        <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Export Users</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Select Role</Label>
                <Select onValueChange={setExportRole} value={exportRole}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Choose a role to export" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="student">Students</SelectItem>
                    <SelectItem value="manager_placements">Manager Placements</SelectItem>
                    <SelectItem value="university_focal">University Focal Person</SelectItem>
                    <SelectItem value="academic_supervisor">Academic Supervisor</SelectItem>
                    <SelectItem value="industrial_supervisor">Industrial Supervisor</SelectItem>
                    <SelectItem value="company_focal">Company Focal Person</SelectItem>
                    <SelectItem value="evaluation_panel">Evaluation Panel Member</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Batch Filter - only show when student role is selected */}
              {exportRole === 'student' && (
                <div>
                  <Label className="text-sm font-medium">Filter by Batch</Label>
                  <Select onValueChange={setExportBatch} value={exportBatch}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="All Batches" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Batches</SelectItem>
                      {Array.from(new Set(allUsers
                        .filter(u => u.role === 'student' && (u as any).batch)
                        .map(u => (u as any).batch)
                      )).sort().map(batch => (
                        <SelectItem key={batch} value={batch}>{batch}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Company Filter - only show when industrial_supervisor or company_focal role is selected */}
              {(exportRole === 'industrial_supervisor' || exportRole === 'company_focal') && (
                <div>
                  <Label className="text-sm font-medium">Filter by Company</Label>
                  <Select onValueChange={setExportCompany} value={exportCompany}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="All Companies" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Companies</SelectItem>
                      {registeredCompanies.map(company => (
                        <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label className="text-sm font-medium">Select Attributes</Label>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      id="email" 
                      checked={exportAttributes.email}
                      onChange={(e) => handleAttributeChange('email', e.target.checked)}
                    />
                    <Label htmlFor="email">Email</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      id="password" 
                      checked={exportAttributes.password}
                      onChange={(e) => handleAttributeChange('password', e.target.checked)}
                    />
                    <Label htmlFor="password">Password</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      id="name" 
                      checked={exportAttributes.name}
                      onChange={(e) => handleAttributeChange('name', e.target.checked)}
                    />
                    <Label htmlFor="name">Name</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      id="role" 
                      checked={exportAttributes.role}
                      onChange={(e) => handleAttributeChange('role', e.target.checked)}
                    />
                    <Label htmlFor="role">Role</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      id="batch" 
                      checked={exportAttributes.batch}
                      onChange={(e) => handleAttributeChange('batch', e.target.checked)}
                    />
                    <Label htmlFor="batch">Batch (for students)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      id="registrationNo" 
                      checked={exportAttributes.registrationNo}
                      onChange={(e) => handleAttributeChange('registrationNo', e.target.checked)}
                    />
                    <Label htmlFor="registrationNo">Registration No. (for students)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      id="company" 
                      checked={exportAttributes.company}
                      onChange={(e) => handleAttributeChange('company', e.target.checked)}
                    />
                    <Label htmlFor="company">Company (for Industrial Supervisor & Company Focal)</Label>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <div className="w-full flex gap-2">
                <Button variant="outline" onClick={handleRegeneratePasswords} className="flex-1">
                  Generate Passwords
                </Button>
                <Button variant="outline" onClick={() => setIsExportDialogOpen(false)} className="flex-1">
                  Cancel
                </Button>
              </div>
              <Button onClick={handleExport} className="w-full sm:w-auto">
                Export to Excel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
