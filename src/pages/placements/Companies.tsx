import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Building2, Plus, Eye, Pencil, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Company, User } from '@/types';
import { getCompanies, createCompany, updateCompany, deleteCompany, getUsers, getApplicationDeadline, setApplicationDeadline } from '@/lib/api';

const companySchema = z.object({
  name: z.string().min(2, 'Company name must be at least 2 characters'),
  industry: z.string().min(2, 'Industry must be at least 2 characters'),
  location: z.string().min(2, 'Location must be at least 2 characters'),
  website: z.string().url('Please enter a valid website URL'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  contactPerson: z.string().min(2, 'Contact person name must be at least 2 characters'),
  contactEmail: z.string().email('Please enter a valid email address'),
});

type CompanyFormData = z.infer<typeof companySchema>;

export default function PlacementsCompanies() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [viewingCompany, setViewingCompany] = useState<Company | null>(null);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<Set<string>>(new Set());
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [globalDeadline, setGlobalDeadline] = useState<string>('');
  const [isSavingDeadline, setIsSavingDeadline] = useState(false);
  const { toast } = useToast();

  function normalizeCompany(company: Company & { _id?: string; isActive?: boolean }): Company {
    return {
      ...company,
      id: String(company.id || company._id || ''),
      isActive: company.isActive !== false,
    };
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [companiesData, usersData] = await Promise.all([
          getCompanies(),
          getUsers()
        ]);
        const normalizedCompanies = (companiesData as (Company & { _id?: string; isActive?: boolean })[])
          .map(normalizeCompany)
          .filter((c) => Boolean(c.id));
        setCompanies(normalizedCompanies);
        setUsers(usersData);

        const deadlineRes = await getApplicationDeadline();
        setGlobalDeadline(String((deadlineRes as any)?.value || ''));
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load companies and users data.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  const handleSaveGlobalDeadline = async () => {
    try {
      setIsSavingDeadline(true);
      const trimmed = String(globalDeadline || '').trim();
      if (!trimmed) {
        toast({ title: 'Missing date', description: 'Please select a deadline date.', variant: 'destructive' });
        return;
      }
      await setApplicationDeadline(trimmed);
      toast({ title: 'Saved', description: 'Global application deadline updated.' });
    } catch (error) {
      console.error('Error saving global deadline:', error);
      toast({ title: 'Error', description: 'Failed to save deadline. Please try again.', variant: 'destructive' });
    } finally {
      setIsSavingDeadline(false);
    }
  };

  const setCompaniesActiveStatus = async (companyIds: string[], isActive: boolean) => {
    if (companyIds.length === 0) return;
    try {
      setIsUpdatingStatus(true);
      await Promise.all(
        companyIds.map((id) => updateCompany(id, { isActive }))
      );
      const updatedCompanies = await getCompanies();
      const normalizedCompanies = (updatedCompanies as (Company & { _id?: string; isActive?: boolean })[])
        .map(normalizeCompany)
        .filter((c) => Boolean(c.id));
      setCompanies(normalizedCompanies);
      setSelectedCompanyIds(new Set());
      toast({
        title: 'Updated',
        description: isActive ? 'Selected companies activated.' : 'Selected companies deactivated.',
      });
    } catch (error) {
      console.error('Error updating company status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update company status. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const toggleSelectAll = (checked: boolean) => {
    if (!checked) {
      setSelectedCompanyIds(new Set());
      return;
    }
    setSelectedCompanyIds(new Set(companies.map((c) => c.id)));
  };

  const toggleSelectOne = (companyId: string, checked: boolean) => {
    setSelectedCompanyIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(companyId);
      else next.delete(companyId);
      return next;
    });
  };

  const form = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: '',
      industry: '',
      location: '',
      website: '',
      description: '',
      contactPerson: '',
      contactEmail: '',
    },
  });

  const handleAddCompany = async (data: CompanyFormData) => {
    try {
      const newCompany = await createCompany({
        name: data.name,
        industry: data.industry,
        location: data.location,
        website: data.website,
        description: data.description,
        contactPerson: data.contactPerson,
        contactEmail: data.contactEmail,
      });

      // Refresh the companies list
      const updatedCompanies = await getCompanies();
      setCompanies(updatedCompanies);

      setIsDialogOpen(false);
      form.reset();
      toast({
        title: 'Success',
        description: 'Company added successfully.',
      });
    } catch (error) {
      console.error('Error creating company:', error);
      toast({
        title: 'Error',
        description: 'Failed to add company. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleViewCompany = (company: Company) => {
    setViewingCompany(company);
  };

  const handleEditCompany = (company: Company) => {
    setEditingCompany(company);
    form.reset({
      name: company.name,
      industry: company.industry,
      location: company.location,
      website: company.website,
      description: company.description,
      contactPerson: company.contactPerson,
      contactEmail: company.contactEmail,
    });
    setIsDialogOpen(true);
  };

  const handleUpdateCompany = async (data: CompanyFormData) => {
    if (!editingCompany) return;

    try {
      await updateCompany(editingCompany.id, {
        name: data.name,
        industry: data.industry,
        location: data.location,
        website: data.website,
        description: data.description,
        contactPerson: data.contactPerson,
        contactEmail: data.contactEmail,
      });

      // Refresh the companies list
      const updatedCompanies = await getCompanies();
      setCompanies(updatedCompanies);

      // Also refresh users list
      const updatedUsers = await getUsers();
      setUsers(updatedUsers);

      setIsDialogOpen(false);
      setEditingCompany(null);
      form.reset();
      toast({
        title: 'Success',
        description: 'Company updated successfully.',
      });
    } catch (error) {
      console.error('Error updating company:', error);
      toast({
        title: 'Error',
        description: 'Failed to update company. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleAddClick = () => {
    setEditingCompany(null);
    form.reset({
      name: '',
      industry: '',
      location: '',
      website: '',
      description: '',
      contactPerson: '',
      contactEmail: '',
    });
    setIsDialogOpen(true);
  };
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <PageHeader
          title="Company Pool"
          description="Manage partner companies"
          action={
            <Button onClick={handleAddClick}>
              <Plus className="h-4 w-4 mr-2" />
              Add Company
            </Button>
          }
        />

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Partner Companies
              </CardTitle>
              <div className="flex flex-col gap-3 md:items-end">
                <div className="flex flex-wrap items-end gap-2">
                  <div className="grid gap-1">
                    <Label className="text-xs text-muted-foreground">Global applying deadline (all companies)</Label>
                    <Input
                      type="date"
                      value={globalDeadline}
                      onChange={(e) => setGlobalDeadline(e.target.value)}
                      className="h-9 w-[220px]"
                    />
                  </div>
                  <Button
                    variant="outline"
                    disabled={isSavingDeadline}
                    onClick={handleSaveGlobalDeadline}
                  >
                    {isSavingDeadline ? 'Saving...' : 'Save Deadline'}
                  </Button>
                </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  disabled={isUpdatingStatus || companies.length === 0}
                  onClick={() => setCompaniesActiveStatus(companies.map((c) => c.id), true)}
                >
                  Activate All
                </Button>
                <Button
                  variant="outline"
                  disabled={isUpdatingStatus || companies.length === 0}
                  onClick={() => setCompaniesActiveStatus(companies.map((c) => c.id), false)}
                >
                  Deactivate All (Close Applying)
                </Button>
                <Button
                  disabled={isUpdatingStatus || selectedCompanyIds.size === 0}
                  onClick={() => setCompaniesActiveStatus(Array.from(selectedCompanyIds), true)}
                >
                  Activate Selected
                </Button>
                <Button
                  variant="destructive"
                  disabled={isUpdatingStatus || selectedCompanyIds.size === 0}
                  onClick={() => setCompaniesActiveStatus(Array.from(selectedCompanyIds), false)}
                >
                  Deactivate Selected
                </Button>
              </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading companies...</span>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[44px]">
                      <Checkbox
                        checked={companies.length > 0 && selectedCompanyIds.size === companies.length}
                        onCheckedChange={(v) => toggleSelectAll(Boolean(v))}
                        aria-label="Select all companies"
                      />
                    </TableHead>
                    <TableHead>Company Name</TableHead>
                    <TableHead>Industry</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Company Focal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map((company) => {
                    const companyFocal = users.find(user => user.role === 'company_focal' && user.companyId === company.id);
                    const isSelected = selectedCompanyIds.has(company.id);
                    return (
                      <TableRow key={company.id}>
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(v) => toggleSelectOne(company.id, Boolean(v))}
                            aria-label={`Select ${company.name}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{company.name}</TableCell>
                        <TableCell className="text-muted-foreground">{company.industry}</TableCell>
                        <TableCell className="text-muted-foreground">{company.location}</TableCell>
                        <TableCell className="text-muted-foreground">{company.contactEmail}</TableCell>
                        <TableCell className="text-muted-foreground">{companyFocal?.name || 'Not Assigned'}</TableCell>
                        <TableCell>
                          {company.isActive !== false ? (
                            <Badge variant="secondary">Active</Badge>
                          ) : (
                            <Badge variant="outline">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleViewCompany(company)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleEditCompany(company)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant={company.isActive !== false ? 'destructive' : 'default'}
                              size="sm"
                              className={
                                company.isActive === false
                                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                  : undefined
                              }
                              disabled={isUpdatingStatus}
                              onClick={() => setCompaniesActiveStatus([company.id], company.isActive === false)}
                            >
                              {company.isActive !== false ? 'Deactivate' : 'Activate'}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* View Company Dialog */}
        <Dialog open={!!viewingCompany} onOpenChange={() => setViewingCompany(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{viewingCompany?.name}</DialogTitle>
            </DialogHeader>
            {viewingCompany && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Industry</Label>
                    <p className="text-sm text-muted-foreground">{viewingCompany.industry}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Location</Label>
                    <p className="text-sm text-muted-foreground">{viewingCompany.location}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Website</Label>
                  <p className="text-sm text-muted-foreground">
                    <a href={viewingCompany.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {viewingCompany.website}
                    </a>
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Description</Label>
                  <p className="text-sm text-muted-foreground">{viewingCompany.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Contact Person</Label>
                    <p className="text-sm text-muted-foreground">{viewingCompany.contactPerson}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Contact Email</Label>
                    <p className="text-sm text-muted-foreground">{viewingCompany.contactEmail}</p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Add/Edit Company Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCompany ? 'Edit Company' : 'Add New Company'}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(editingCompany ? handleUpdateCompany : handleAddCompany)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter company name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="industry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Industry</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Technology, Finance" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input placeholder="City, State/Country" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <Input placeholder="https://company.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Brief description of the company and its focus areas"
                          className="min-h-[80px]"
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
                    name="contactPerson"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Person</FormLabel>
                        <FormControl>
                          <Input placeholder="Full name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contactEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Email</FormLabel>
                        <FormControl>
                          <Input placeholder="email@company.com" type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">{editingCompany ? 'Update Company' : 'Add Company'}</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
