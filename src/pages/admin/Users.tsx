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
import { mockUsers, mockStudents, roleLabels } from '@/data/mockData';
import { Users, Plus, Pencil, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
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
  email: z.string()
    .min(1, 'Email is required')
    .regex(/^[a-zA-Z0-9.]+@gmail\.com$/, 'Email must be a valid Gmail address (dots allowed in username, but must end exactly with @gmail.com)')
    .max(254, 'Email must be less than 254 characters')
    .transform(val => val.toLowerCase()),
  role: z.enum(['manager_placements', 'university_focal', 'academic_supervisor', 'industrial_supervisor', 'company_focal', 'evaluation_panel', 'student']),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be less than 50 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z.string(),
  department: z.string()
    .max(100, 'Department must be less than 100 characters')
    .optional()
    .or(z.literal('')),
  registrationNo: z.string().max(50, 'Registration number must be less than 50 characters').optional().or(z.literal('')),
  cgpa: z.string().optional().or(z.literal('')),
  batch: z.string().max(10, 'Batch must be less than 10 characters').optional().or(z.literal('')),
  section: z.string().max(3, 'Section must be less than 3 characters').optional().or(z.literal('')),
});

type UserFormData = z.infer<typeof userFormSchema>;

const STORAGE_KEY = 'sit_portal_users';

// Load users from localStorage or use mock data
const loadUsers = (): (User | Student)[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading users from localStorage:', error);
  }
  return [...mockUsers, ...mockStudents];
};

// Save users to localStorage
const saveUsers = (users: (User | Student)[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  } catch (error) {
    console.error('Error saving users to localStorage:', error);
  }
};

export default function AdminUsers() {
  const [allUsers, setAllUsers] = useState<(User | Student)[]>(() => loadUsers());
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<(User | Student) | null>(null);
  const [expandedRoles, setExpandedRoles] = useState<Set<UserRole>>(new Set());
  const { toast } = useToast();

  // Save to localStorage whenever users change
  useEffect(() => {
    saveUsers(allUsers);
  }, [allUsers]);

  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: '',
      email: '',
      role: 'student',
      username: '',
      password: '',
      department: '',
      registrationNo: '',
      cgpa: '',
      batch: '',
      section: '',
    },
  });

  const watchedRole = form.watch('role');
  const showStudentFields = (selectedUser && selectedUser.role === 'student') || form.getValues('role') === 'student';
  const validRoles = ['manager_placements', 'university_focal', 'academic_supervisor', 'industrial_supervisor', 'company_focal', 'evaluation_panel', 'student'] as const;

  const handleAddClick = () => {
    form.reset({
      name: '',
      email: '',
      role: 'student',
      username: '',
      password: '',
      department: '',
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
      password: '', // Don't pre-fill password for security
      department: user.department || '',
      registrationNo: (user as Student).studentId || '',
      cgpa: (typeof (user as Student).cgpa === 'number' ? String((user as Student).cgpa) : ''),
      batch: ((user as Student & { batch?: string }).batch) || '',
      section: ((user as Student & { section?: string }).section) || '',
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

  const onSubmit = (data: UserFormData) => {
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

      setAllUsers(prevUsers =>
        prevUsers.map(u => {
          if (u.id !== selectedUser.id) return u;
          const updated = { ...u, name: data.name, email: data.email, role: data.role as UserRole, username: data.username, department: data.department || 'IT' } as unknown as User | Student;
          if (data.password && data.password.trim() !== '') {
            if (data.password.length < 6) {
              form.setError('password', {
                type: 'manual',
                message: 'Password must be at least 6 characters',
              });
              return u;
            }
            updated.password = data.password;
          }
          if (data.role === 'student') {
            const stud = updated as Student & { batch?: string; section?: string };
            stud.studentId = data.registrationNo || (selectedUser as Student).studentId;
            stud.cgpa = data.cgpa ? parseFloat(data.cgpa) : (selectedUser as Student).cgpa || 0;
            stud.batch = data.batch || (selectedUser as (Student & { batch?: string })).batch || '';
            stud.section = data.section || (selectedUser as (Student & { section?: string })).section || '';
          }
          return updated;
        })
      );
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

      // Add new user - password is required
      if (!data.password || data.password.length < 6) {
        form.setError('password', {
          type: 'manual',
          message: 'Password must be at least 6 characters',
        });
        return;
      }
      const newUser: User = {
        id: `user-${Date.now()}`,
        name: data.name,
        email: data.email,
        role: data.role,
        username: data.username,
        password: data.password,
        department: data.department || 'IT',
      };
      setAllUsers(prevUsers => [...prevUsers, newUser]);
      toast({
        title: 'User Added',
        description: `${data.name} has been added successfully.`,
      });
      setIsAddDialogOpen(false);
    }
    form.reset();
  };

  const handleDelete = () => {
    if (selectedUser) {
      setAllUsers(prevUsers => prevUsers.filter(user => user.id !== selectedUser.id));
      toast({
        title: 'User Deleted',
        description: `${selectedUser.name} has been deleted successfully.`,
      });
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <PageHeader
          title="User Management"
          description="Manage all system users"
          action={
            <Button onClick={handleAddClick}>
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
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
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.name}</TableCell>
                            <TableCell className="text-muted-foreground">{user.email}</TableCell>
                            <TableCell className="text-muted-foreground">{user.username || '-'}</TableCell>
                            <TableCell className="text-muted-foreground">{user.department || '-'}</TableCell>
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
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter password" {...field} />
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password (Leave blank to keep current)</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter new password" {...field} />
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
                  </>
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
      </div>
    </DashboardLayout>
  );
}
