import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { mockDocuments } from '@/data/mockData';
import { FileText, Download, FileCheck, File, BookOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function StudentDocuments() {
  const { toast } = useToast();

  const handleDownload = (docName: string) => {
    toast({
      title: 'Download Started',
      description: `Downloading ${docName}...`,
    });
  };

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'acceptance_letter':
        return <FileCheck className="h-8 w-8 text-success" />;
      case 'completion_letter':
        return <FileCheck className="h-8 w-8 text-primary" />;
      case 'guideline':
        return <BookOpen className="h-8 w-8 text-info" />;
      default:
        return <File className="h-8 w-8 text-muted-foreground" />;
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Documents"
          description="Access internship-related documents and guidelines"
        />

        {/* Quick Links */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-info/10">
                  <BookOpen className="h-6 w-6 text-info" />
                </div>
                <div>
                  <h3 className="font-medium">Guidelines</h3>
                  <p className="text-sm text-muted-foreground">Program requirements</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success/10">
                  <FileCheck className="h-6 w-6 text-success" />
                </div>
                <div>
                  <h3 className="font-medium">Letters</h3>
                  <p className="text-sm text-muted-foreground">Official documents</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Reports</h3>
                  <p className="text-sm text-muted-foreground">Progress reports</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Documents List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Available Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {getDocumentIcon(doc.type)}
                    <div>
                      <h3 className="font-medium">{doc.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">{getDocumentTypeLabel(doc.type)}</Badge>
                        <span className="text-xs text-muted-foreground">
                          Uploaded: {doc.uploadedDate}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" onClick={() => handleDownload(doc.name)}>
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </div>
              ))}

              {/* Placeholder documents */}
              {[
                { name: 'Report Template', type: 'report', date: '2024-01-15' },
                { name: 'Evaluation Form', type: 'guideline', date: '2024-01-10' },
              ].map((doc, index) => (
                <div
                  key={`extra-${index}`}
                  className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {getDocumentIcon(doc.type)}
                    <div>
                      <h3 className="font-medium">{doc.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">{getDocumentTypeLabel(doc.type)}</Badge>
                        <span className="text-xs text-muted-foreground">
                          Uploaded: {doc.date}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" onClick={() => handleDownload(doc.name)}>
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
