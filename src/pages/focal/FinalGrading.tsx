import { useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useRealtimeFocalFinalGrading } from '@/hooks/use-realtime-data';
import type { Student } from '@/types';

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

export default function FocalFinalGrading() {
  const { data, loading } = useRealtimeFocalFinalGrading();

  const pending: FocalFinalGradingRow[] = (data?.pending || []) as FocalFinalGradingRow[];
  const completed: FocalFinalGradingRow[] = (data?.completed || []) as FocalFinalGradingRow[];

  const content = useMemo(() => {
    return (
      <div className="space-y-8">
        <FinalGradingTable title="Pending" rows={pending} />
        <FinalGradingTable title="Completed" rows={completed} />
      </div>
    );
  }, [pending, completed]);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <PageHeader
          title="Final Grading"
          description="Structured overview of internal (academic + panel) and external (industrial) marks. Totals are auto-calculated out of 100."
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

