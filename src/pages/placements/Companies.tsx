import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { mockCompanies } from '@/data/mockData';
import { Building2, Plus, Eye, Pencil } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Company } from '@/types';

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
  const [companies, setCompanies] = useState(mockCompanies);
  const [viewingCompany, setViewingCompany] = useState<Company | null>(null);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const { toast } = useToast();

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

  const handleAddCompany = (data: CompanyFormData) => {
    const newCompany: Company = {
      id: `c${companies.length + 1}`,
      name: data.name,
      industry: data.industry,
      location: data.location,
      website: data.website,
      description: data.description,
      contactPerson: data.contactPerson,
      contactEmail: data.contactEmail,
      isActive: true,
    };

    setCompanies([...companies, newCompany]);
    setIsDialogOpen(false);
    form.reset();

    toast({
      title: 'Company Added',
      description: `${data.name} has been added to the company pool.`,
    });
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

  const handleUpdateCompany = (data: CompanyFormData) => {
    if (!editingCompany) return;

    const updatedCompanies = companies.map(company =>
      company.id === editingCompany.id
        ? { ...company, ...data }
        : company
    );

    setCompanies(updatedCompanies);
    setIsDialogOpen(false);
    setEditingCompany(null);
    form.reset();

    toast({
      title: 'Company Updated',
      description: `${data.name} has been updated successfully.`,
    });
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
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Partner Companies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company Name</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell className="font-medium">{company.name}</TableCell>
                    <TableCell className="text-muted-foreground">{company.industry}</TableCell>
                    <TableCell className="text-muted-foreground">{company.location}</TableCell>
                    <TableCell className="text-muted-foreground">{company.contactEmail}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleViewCompany(company)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleEditCompany(company)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
