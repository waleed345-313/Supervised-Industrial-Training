import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useRealtimeData, useRealtimeSupervisorStudents } from '@/hooks/use-realtime-data';
import { getSupervisorMonthlyEvaluations } from '@/lib/api';
import { FileText, Eye, Filter } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface MonthlyEvaluation {
  id: string;
  studentId: string;
  studentName: string;
  evaluatorName: string;
  month: string;
  marksOutOf12_5: number;
  remarks: string;
  date: string;
}

function normalizeMonthLabel(month: string) {
  return String(month || '').trim();
}

function monthSortKey(month: string) {
  const m = normalizeMonthLabel(month);
  const match = m.match(/(\d+)/);
  const n = match ? Number(match[1]) : Number.NaN;
  if (Number.isFinite(n)) return n;
  return Number.MAX_SAFE_INTEGER;
}

export default function SupervisorProgress() {
  const [selectedEval, setSelectedEval] = useState<MonthlyEvaluation | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(() => localStorage.getItem('supervisor_progress_student') || 'all');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => localStorage.getItem('supervisor_progress_month') || 'all');
  const { data: students = [] } = useRealtimeSupervisorStudents();

  useEffect(() => {
    localStorage.setItem('supervisor_progress_student', selectedStudentId);
  }, [selectedStudentId]);

  useEffect(() => {
    localStorage.setItem('supervisor_progress_month', selectedMonth);
  }, [selectedMonth]);

  const fetchMonthlyMarks = useCallback(() => {
    return getSupervisorMonthlyEvaluations({
      studentId: selectedStudentId === 'all' ? undefined : selectedStudentId,
      month: selectedMonth === 'all' ? undefined : selectedMonth,
    });
  }, [selectedMonth, selectedStudentId]);

  const {
    data: monthlyEvals = [],
    loading: loadingMonthly,
    error: errorMonthly,
    refresh: refreshMonthly,
  } = useRealtimeData({
    fetchFn: fetchMonthlyMarks,
    socketEvent: 'supervisor:update',
    updateTypes: ['evaluations'],
    initialData: [],
    pollingInterval: 30000,
  });

  const monthOptions = Array.from(
    new Set(
      [
        ...(monthlyEvals as MonthlyEvaluation[]).map((e) => normalizeMonthLabel(e.month)),
      ].filter(Boolean)
    )
  ).sort((a, b) => monthSortKey(a) - monthSortKey(b) || a.localeCompare(b));

  const filteredMonthly = (monthlyEvals as MonthlyEvaluation[]).filter((e) => {
    if (selectedStudentId !== 'all' && String(e.studentId) !== String(selectedStudentId)) return false;
    if (selectedMonth !== 'all' && normalizeMonthLabel(e.month) !== normalizeMonthLabel(selectedMonth)) return false;
    return true;
  });

  const monthlyByMonth = filteredMonthly.reduce<Record<string, MonthlyEvaluation[]>>((acc, e) => {
    const m = normalizeMonthLabel(e.month) || 'Unknown';
    acc[m] = acc[m] || [];
    acc[m].push(e);
    return acc;
  }, {});

  const monthSections =
    selectedMonth === 'all'
      ? Object.keys(monthlyByMonth).sort((a, b) => monthSortKey(a) - monthSortKey(b) || a.localeCompare(b))
      : [selectedMonth].filter((m) => (m in monthlyByMonth) || filteredMonthly.length > 0);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <PageHeader
          title="Progress Reports"
          description="Review student progress reports"
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Submitted Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 mb-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Filter className="h-4 w-4" />
                Filters
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Student</Label>
                  <Select value={selectedStudentId} onValueChange={(v) => setSelectedStudentId(String(v))}>
                    <SelectTrigger>
                      <SelectValue placeholder="All students" />
                    </SelectTrigger>
                    <SelectContent position="popper" align="start">
                      <SelectItem value="all">All students</SelectItem>
                      {students.map((s: any) => (
                        <SelectItem key={String(s.id)} value={String(s.id)}>
                          {String(s.name || 'Student')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Month</Label>
                  <Select value={selectedMonth} onValueChange={(v) => setSelectedMonth(String(v))}>
                    <SelectTrigger>
                      <SelectValue placeholder="All months" />
                    </SelectTrigger>
                    <SelectContent position="popper" align="start">
                      <SelectItem value="all">All months</SelectItem>
                      {monthOptions.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {loadingMonthly ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Loading monthly progress…</p>
              </div>
            ) : errorMonthly ? (
              <div className="text-center py-8 text-red-500">
                <p>Failed to load reports. Please try again.</p>
              </div>
            ) : filteredMonthly.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No progress reports found for the selected filters.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {monthSections.map((month) => (
                  <div key={month} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold">{month}</div>
                      <div className="text-xs text-muted-foreground">
                        {(monthlyByMonth[month] || []).length} report(s)
                      </div>
                    </div>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead>Submitted</TableHead>
                          <TableHead>Marks</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(monthlyByMonth[month] || [])
                          .slice()
                          .sort((a, b) => String(a.studentName || '').localeCompare(String(b.studentName || '')))
                          .map((e) => (
                            <TableRow key={e.id}>
                              <TableCell className="font-medium">{e.studentName}</TableCell>
                              <TableCell className="text-muted-foreground">
                                {e.date}
                              </TableCell>
                              <TableCell className="text-muted-foreground">{Number(e.marksOutOf12_5 || 0).toFixed(2)}/12.5</TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                                    <DialogTrigger asChild>
                                      <Button size="sm" variant="outline" onClick={() => setSelectedEval(e)}>
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                      <DialogHeader>
                                        <DialogTitle className="flex items-center gap-2">
                                          <FileText className="h-5 w-5" />
                                          Monthly Progress (Industrial Supervisor)
                                        </DialogTitle>
                                      </DialogHeader>
                                      {selectedEval && (
                                        <div className="space-y-4">
                                          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                                            <div>
                                              <span className="text-sm font-medium">Student:</span>
                                              <p className="text-sm text-muted-foreground">{selectedEval.studentName}</p>
                                            </div>
                                            <div>
                                              <span className="text-sm font-medium">Month:</span>
                                              <p className="text-sm text-muted-foreground">{selectedEval.month}</p>
                                            </div>
                                            <div>
                                              <span className="text-sm font-medium">Submitted:</span>
                                              <p className="text-sm text-muted-foreground">{selectedEval.date}</p>
                                            </div>
                                            <div>
                                              <span className="text-sm font-medium">Marks:</span>
                                              <p className="text-sm text-muted-foreground">
                                                {Number(selectedEval.marksOutOf12_5 || 0).toFixed(2)}/12.5
                                              </p>
                                            </div>
                                          </div>

                                          <div>
                                            <h4 className="text-sm font-medium mb-2">Industrial Supervisor Remarks</h4>
                                            <div className="p-4 border rounded-lg bg-background">
                                              <p className="text-sm">{selectedEval.remarks || '—'}</p>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </DialogContent>
                                  </Dialog>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                ))}

                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={() => refreshMonthly()}>
                    Refresh
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
