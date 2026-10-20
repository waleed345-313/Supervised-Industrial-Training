import { useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeFocalFinalGrading } from '@/hooks/use-realtime-data';
import { getFocalObeSheetExport } from '@/lib/api';
import { downloadObeSheetPdf, type ObeSheetStudentRow } from '@/lib/obeSheetPdf';
import {
  ObeSheetExportDialog,
  type ObeSheetExportOptions,
} from '@/components/shared/ObeSheetExportDialog';

interface InternalContributionRow {
  evaluatorUser: string;
  evaluatorName: string;
  evaluatorRole: 'evaluation_panel' | 'academic_supervisor' | string;
  internalTotal: number;
}

interface FocalFinalGradingRow {
  studentUserId: string;
  studentId: string;
  studentName: string;
  batch?: string;
  section?: string;
  externalTotal: number;
  internalTotal: number;
  grandTotal: number;
  grade: string;
  academicCount: number;
  panelCount: number;
  internalEvaluations: InternalContributionRow[];
  isCompleted: boolean;
}

function gradeBadgeVariant(isCompleted: boolean) {
  return isCompleted ? 'default' : 'secondary';
}

function roleLabel(role: string) {
  if (role === 'academic_supervisor') return 'Academic supervisor';
  if (role === 'evaluation_panel') return 'Evaluation panel';
  return role;
}

function formatRegistrationNumber(raw: string) {
  const s = String(raw || '').trim();
  if (!s) return '—';
  if (/^\d+$/.test(s)) return s.padStart(3, '0');
  return s;
}

function getLatestBatch(batchValues: string[]) {
  const valid = batchValues
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .map((value) => {
      const match = value.match(/\d+/);
      return {
        value,
        numeric: match ? Number(match[0]) : Number.NEGATIVE_INFINITY,
      };
    })
    .sort((a, b) => b.numeric - a.numeric || a.value.localeCompare(b.value));

  return valid[0]?.value || 'all';
}

function EvaluatorMarksCell({ row }: { row: FocalFinalGradingRow }) {
  const contributions = row.internalEvaluations || [];
  const sorted = [...contributions].sort((a, b) => String(a.evaluatorRole).localeCompare(String(b.evaluatorRole)));

  return (
    <div className="space-y-2">
      <div className="text-sm tabular-nums font-medium">
        Academic: {row.academicCount} · Panel: {row.panelCount}
      </div>
      {sorted.length > 0 ? (
        <div className="space-y-1">
          {sorted.map((c) => (
            <div key={`${c.evaluatorUser}-${c.evaluatorRole}-${c.internalTotal}`}>
              <span className="text-xs text-muted-foreground">
                {roleLabel(c.evaluatorRole)}: {c.evaluatorName || '—'}
              </span>
              <span className="text-xs tabular-nums ml-2 font-medium text-foreground">
                {Number(c.internalTotal || 0).toFixed(2)}/50
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">No internal marks submitted yet.</div>
      )}
    </div>
  );
}

function FinalGradingTable({
  title,
  rows,
}: {
  title: string;
  rows: FocalFinalGradingRow[];
}) {
  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center text-muted-foreground text-sm">No students in this category.</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[120px]">Serial Number</TableHead>
              <TableHead className="min-w-[140px]">Student ID</TableHead>
              <TableHead className="min-w-[220px]">Student Name</TableHead>
              <TableHead className="min-w-[260px]">Internal + External Marks (out of 100)</TableHead>
              <TableHead className="min-w-[260px]">
                Number of Academic Supervisors and Evaluation Panel Members who have completed marking
              </TableHead>
              <TableHead className="min-w-[140px]">Final Grade</TableHead>
              <TableHead className="min-w-[160px]">Overall calculated marks out of 100</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, idx) => (
              <TableRow key={row.studentUserId}>
                <TableCell className="tabular-nums">{idx + 1}</TableCell>
                <TableCell className="tabular-nums">{formatRegistrationNumber(row.studentId)}</TableCell>
                <TableCell className="font-medium">{row.studentName}</TableCell>
                <TableCell className="text-muted-foreground">
                  <div className="space-y-1">
                    <div className="tabular-nums font-medium text-foreground">
                      Ext {Number(row.externalTotal || 0).toFixed(1)}/50 + Int{' '}
                      {Number(row.internalTotal || 0).toFixed(2)}/50
                    </div>
                    <div className="tabular-nums text-xs">
                      = {Number(row.grandTotal || 0).toFixed(1)}/100
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <EvaluatorMarksCell row={row} />
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <Badge variant={gradeBadgeVariant(row.isCompleted)}>{row.grade}</Badge>
                    {!row.isCompleted && <div className="text-[11px] text-muted-foreground">Pending</div>}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground tabular-nums">
                  {Number(row.grandTotal || 0).toFixed(1)}/100
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

const OBE_SHEET_DEFAULTS: ObeSheetExportOptions = {
  title: 'IET SIT-2 (Batch 2021)',
  instructor: 'Usman Ahmed',
  semester: 'BSIET-8 (Spring 2025)',
};

export default function FocalFinalGrading() {
  const { data, loading } = useRealtimeFocalFinalGrading();
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState('all');
  const [selectedSection, setSelectedSection] = useState('all');

  const pending: FocalFinalGradingRow[] = (data?.pending || []) as FocalFinalGradingRow[];
  const completed: FocalFinalGradingRow[] = (data?.completed || []) as FocalFinalGradingRow[];

  const batchOptions = useMemo(
    () => Array.from(new Set([...pending, ...completed].map((row) => String(row.batch || '').trim()).filter(Boolean))).sort(),
    [pending, completed],
  );

  const latestBatch = useMemo(() => getLatestBatch(batchOptions), [batchOptions]);

  useEffect(() => {
    if (latestBatch !== 'all' && selectedBatch === 'all') {
      setSelectedBatch(latestBatch);
    }
  }, [latestBatch, selectedBatch]);

  const matchesFilters = (row: FocalFinalGradingRow) => {
    const batch = String(row.batch || '').trim().toUpperCase();
    const section = String(row.section || '').trim().toUpperCase();

    const batchMatch = selectedBatch === 'all' || batch === selectedBatch.toUpperCase();
    const sectionMatch =
      selectedSection === 'all' ||
      selectedSection === 'both' ||
      section === selectedSection.toUpperCase();

    return batchMatch && sectionMatch;
  };

  const filteredPending = useMemo(() => pending.filter(matchesFilters), [pending, selectedBatch, selectedSection]);
  const filteredCompleted = useMemo(() => completed.filter(matchesFilters), [completed, selectedBatch, selectedSection]);

  const handleExportObePdf = async (options: ObeSheetExportOptions = OBE_SHEET_DEFAULTS) => {
    setExporting(true);
    try {
      const payload = await getFocalObeSheetExport(options);
      const meta = payload?.meta || options;
      const students = (payload?.students || []) as ObeSheetStudentRow[];

      if (!students.length) {
        toast({
          title: 'No students ready for export',
          description:
            'PDF includes students from the Completed list (internal final grading submitted).',
          variant: 'destructive',
        });
        return;
      }

      downloadObeSheetPdf(meta, students);
      setExportDialogOpen(false);
      toast({
        title: 'OBE sheet downloaded',
        description: `${students.length} student(s) included in the PDF.`,
      });
    } catch (err) {
      toast({
        title: 'Export failed',
        description: err instanceof Error ? err.message : 'Could not generate OBE PDF.',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const content = useMemo(() => {
    return (
      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Filter students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="batch-filter">Batch</Label>
                <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                  <SelectTrigger id="batch-filter">
                    <SelectValue placeholder="All batches" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All batches</SelectItem>
                    {batchOptions.map((batch) => (
                      <SelectItem key={batch} value={batch}>{batch}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="section-filter">Section</Label>
                <Select value={selectedSection} onValueChange={setSelectedSection}>
                  <SelectTrigger id="section-filter">
                    <SelectValue placeholder="All sections" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All sections</SelectItem>
                    <SelectItem value="A">A</SelectItem>
                    <SelectItem value="B">B</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSelectedBatch('all');
                    setSelectedSection('all');
                  }}
                >
                  Reset filters
                </Button>
              </div>

              <div className="flex items-end text-sm text-muted-foreground">
                Showing {filteredPending.length + filteredCompleted.length} student(s) across the selected batch/section.
              </div>
            </div>
          </CardContent>
        </Card>

        <FinalGradingTable title="Pending" rows={filteredPending} />
        <FinalGradingTable title="Completed" rows={filteredCompleted} />
      </div>
    );
  }, [batchOptions, filteredCompleted, filteredPending, selectedBatch, selectedSection]);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <PageHeader
          title="Final Grading"
          description="Structured overview of internal (academic + panel) and external (industrial) marks. Totals are auto-calculated out of 100."
          action={
            <Button onClick={() => setExportDialogOpen(true)} disabled={loading}>
              <Download className="h-4 w-4 mr-2" />
              Export OBE Sheet (PDF)
            </Button>
          }
        />

        <ObeSheetExportDialog
          open={exportDialogOpen}
          onOpenChange={setExportDialogOpen}
          exporting={exporting}
          onExport={handleExportObePdf}
        />

        {loading ? (
          <Card>
            <CardContent>
              <div className="py-10 text-center text-muted-foreground">Loading…</div>
            </CardContent>
          </Card>
        ) : (
          content
        )}
      </div>
    </DashboardLayout>
  );
}
