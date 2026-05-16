import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { RefreshCw, Building2, Loader2, Search, Users, Briefcase, Info, UserMinus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  API_BASE,
  backfillReplacementDocuments,
  getReplacementCandidates,
  getReplacementVacancies,
  releaseReplacementAllocations,
  submitReplacementApplication,
} from '@/lib/api';
import { io, type Socket } from 'socket.io-client';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

type PriorityRow = {
  id: string;
  status: string;
  internshipTitle: string;
  companyName: string;
  internshipStatus?: string;
  terminal: boolean;
};

type ReplacementCandidate = {
  studentUserId: string;
  name: string;
  email: string;
  studentId: string;
  cgpa: number;
  specialization: string;
  applicationCount: number;
  maxApplications: number;
  currentStatus: string;
  canReplace: boolean;
  eligibilityReason: string | null;
  canChange?: boolean;
  changeReason?: string | null;
  priorityApplications: PriorityRow[];
  replacementApplications: { id: string; status: string; internshipTitle: string; companyName: string }[];
};

type VacancyRow = {
  internshipId: string;
  title: string;
  companyId: string;
  companyName: string;
  location?: string;
  duration: string;
  seats: number;
  seatsFilled: number;
  vacantSeats: number;
  internshipStatus: string;
  deadline?: string | null;
  cgpaRequirement?: string | null;
  isFull?: boolean;
};

export default function ReplacementManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [candidates, setCandidates] = useState<ReplacementCandidate[]>([]);
  const [vacancies, setVacancies] = useState<VacancyRow[]>([]);
  const [dialogVacancies, setDialogVacancies] = useState<VacancyRow[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(true);
  const [loadingVacancies, setLoadingVacancies] = useState(true);
  const [loadingDialogVacancies, setLoadingDialogVacancies] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<ReplacementCandidate | null>(null);
  const [vacancySearch, setVacancySearch] = useState('');
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [backfillingId, setBackfillingId] = useState<string | null>(null);
  const [flowMode, setFlowMode] = useState<'replace' | 'change'>('replace');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [releasingSeats, setReleasingSeats] = useState(false);

  const allocatedStudentIds = useMemo(
    () =>
      candidates
        .filter((c) => String(c.currentStatus || '').toLowerCase() === 'allocated')
        .map((c) => c.studentUserId),
    [candidates]
  );

  const allAllocatedSelected =
    allocatedStudentIds.length > 0 && allocatedStudentIds.every((id) => selectedStudentIds.includes(id));

  const loadCandidates = useCallback(async () => {
    setLoadingCandidates(true);
    try {
      const data = await getReplacementCandidates();
      setCandidates(Array.isArray(data) ? (data as ReplacementCandidate[]) : []);
    } catch (e) {
      console.error(e);
      toast({
        title: 'Could not load students',
        description: 'Check your session and that you are signed in as Placement Manager.',
        variant: 'destructive',
      });
      setCandidates([]);
    } finally {
      setLoadingCandidates(false);
    }
  }, [toast]);

  const loadVacancies = useCallback(async () => {
    setLoadingVacancies(true);
    try {
      const data = await getReplacementVacancies();
      setVacancies(Array.isArray(data) ? (data as VacancyRow[]) : []);
    } catch (e) {
      console.error(e);
      toast({
        title: 'Could not load vacancies',
        description: 'Try again shortly.',
        variant: 'destructive',
      });
      setVacancies([]);
    } finally {
      setLoadingVacancies(false);
    }
  }, [toast]);

  const loadDialogVacancies = useCallback(async (studentUserId: string) => {
    setLoadingDialogVacancies(true);
    try {
      const data = await getReplacementVacancies({ excludeForStudent: studentUserId, includeFilled: true });
      setDialogVacancies(Array.isArray(data) ? (data as VacancyRow[]) : []);
    } catch (e) {
      console.error(e);
      toast({
        title: 'Could not load openings for this student',
        description: 'Try closing the dialog and opening Replace again.',
        variant: 'destructive',
      });
      setDialogVacancies([]);
    } finally {
      setLoadingDialogVacancies(false);
    }
  }, [toast]);

  useEffect(() => {
    loadCandidates();
    loadVacancies();
  }, [loadCandidates, loadVacancies]);

  const dialogOpenRef = useRef(dialogOpen);
  const selectedStudentRef = useRef<ReplacementCandidate | null>(null);

  useEffect(() => {
    dialogOpenRef.current = dialogOpen;
  }, [dialogOpen]);

  useEffect(() => {
    selectedStudentRef.current = selectedStudent;
  }, [selectedStudent]);

  useEffect(() => {
    const token = localStorage.getItem('sit_portal_token');
    if (!token || user?.role !== 'manager_placements') return;
    const socket: Socket = io(API_BASE, { auth: { token } });
    const onPlacements = () => {
      loadVacancies();
      loadCandidates();
      if (dialogOpenRef.current && selectedStudentRef.current) {
        void loadDialogVacancies(selectedStudentRef.current.studentUserId);
      }
    };
    socket.on('placements:update', onPlacements);
    return () => {
      socket.off('placements:update', onPlacements);
      socket.disconnect();
    };
  }, [user?.role, loadVacancies, loadCandidates, loadDialogVacancies]);

  const filteredDialogVacancies = useMemo(() => {
    const q = vacancySearch.trim().toLowerCase();
    if (!q) return dialogVacancies;
    return dialogVacancies.filter(
      (v) =>
        v.companyName.toLowerCase().includes(q) ||
        v.title.toLowerCase().includes(q) ||
        (v.location && v.location.toLowerCase().includes(q))
    );
  }, [dialogVacancies, vacancySearch]);

  const openRoutingDialog = (c: ReplacementCandidate, mode: 'replace' | 'change') => {
    setSelectedStudent(c);
    setFlowMode(mode);
    setVacancySearch('');
    setDialogOpen(true);
    void loadDialogVacancies(c.studentUserId);
  };

  const toggleShuffleSelectionMode = () => {
    setSelectionMode((m) => {
      if (m) setSelectedStudentIds([]);
      return !m;
    });
  };

  const toggleStudentRowSelected = (studentUserId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentUserId) ? prev.filter((id) => id !== studentUserId) : [...prev, studentUserId]
    );
  };

  const toggleSelectAllAllocated = () => {
    if (allAllocatedSelected) {
      setSelectedStudentIds((prev) => prev.filter((id) => !allocatedStudentIds.includes(id)));
    } else {
      setSelectedStudentIds((prev) => [...new Set([...prev, ...allocatedStudentIds])]);
    }
  };

  const handleReleaseSelectedSeats = async () => {
    if (selectedStudentIds.length === 0) return;
    setReleasingSeats(true);
    try {
      const res = (await releaseReplacementAllocations(selectedStudentIds)) as {
        results: { studentUserId: string; ok: boolean; reason?: string }[];
      };
      const results = Array.isArray(res?.results) ? res.results : [];
      const freed = results.filter((r) => r.ok).length;
      const skipped = results.filter((r) => !r.ok).length;
      toast({
        title: freed ? 'Seats freed' : 'No seats freed',
        description:
          freed > 0
            ? `Released ${freed} allocation(s).${skipped ? ` ${skipped} student(s) were not currently allocated to a seat.` : ''}`
            : skipped
              ? 'None of the selected students had an active company allocation to remove.'
              : 'Nothing to process.',
      });
      setSelectedStudentIds([]);
      await Promise.all([loadCandidates(), loadVacancies()]);
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Request failed';
      toast({ title: 'Could not free seats', description: msg.slice(0, 220), variant: 'destructive' });
    } finally {
      setReleasingSeats(false);
    }
  };

  const handleBackfillPriorityDocuments = async (applicationId: string) => {
    setBackfillingId(applicationId);
    try {
      const res = (await backfillReplacementDocuments(applicationId)) as {
        msg?: string;
        resumeLinked?: boolean;
      };
      toast({
        title: res?.resumeLinked ? 'Documents updated' : 'Nothing to attach',
        description:
          res?.msg ||
          (res?.resumeLinked
            ? 'Priority CV/files are linked to this replacement application.'
            : 'Could not find priority uploads for this student.'),
      });
      await loadCandidates();
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Request failed';
      toast({ title: 'Could not attach files', description: msg.slice(0, 220), variant: 'destructive' });
    } finally {
      setBackfillingId(null);
    }
  };

  const handleSubmitToCompany = async (vacancy: VacancyRow) => {
    if (!selectedStudent) return;
    setSubmittingId(vacancy.internshipId);
    try {
      await submitReplacementApplication({
        studentUserId: selectedStudent.studentUserId,
        internshipId: vacancy.internshipId,
        mode: flowMode,
      });
      toast({
        title: flowMode === 'change' ? 'Change request submitted' : 'Replacement submitted',
        description:
          flowMode === 'change'
            ? `${selectedStudent.name} — transfer application sent to ${vacancy.companyName} for ${vacancy.title}.`
            : `${selectedStudent.name} — application sent to ${vacancy.companyName} for ${vacancy.title}.`,
      });
      setDialogOpen(false);
      setSelectedStudent(null);
      await Promise.all([loadCandidates(), loadVacancies()]);
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Submission failed';
      toast({ title: 'Could not submit', description: msg.slice(0, 220), variant: 'destructive' });
    } finally {
      setSubmittingId(null);
    }
  };

  const formatPrioritySummary = (p: PriorityRow) => {
    const bits = [p.status];
    if (p.internshipStatus && p.internshipStatus !== 'open') bits.push(`(${p.internshipStatus})`);
    return bits.join(' ');
  };

  if (user && user.role !== 'manager_placements') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <PageHeader
          title="Replacement Management"
          description="Route students to companies with open seats after both priority applications are closed — deadlines and posted CGPA rules are not applied here."
        />

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                How it works
              </CardTitle>
              <CardDescription>
                Replace becomes available only when both standard applications are no longer active (rejected, or unavailable
                e.g. closed role or no seats). Use Change when a student needs to move company during SIT.
                Submitted applications appear on the company focal Applications list and follow the usual review + acceptance letter flow.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Briefcase className="h-4 w-4" />
                Vacancy list
              </CardTitle>
              <CardDescription>
                Shows every active company internship that still has at least one seat free. List updates live when allocations
                change.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => void loadVacancies()} disabled={loadingVacancies}>
                {loadingVacancies ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                <span className="ml-2">Refresh vacancies</span>
              </Button>
              <Badge variant="secondary">{vacancies.length} open with capacity</Badge>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Students
              </CardTitle>
              <CardDescription>
                Placement routing and eligibility. Use shuffle mode to free a filled seat, then use Replace to send another student
                once a seat opens.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {selectionMode && selectedStudentIds.length > 0 && (
                <Button size="sm" disabled={releasingSeats} onClick={() => void handleReleaseSelectedSeats()}>
                  {releasingSeats ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="ml-2">Working…</span>
                    </>
                  ) : (
                    `Free ${selectedStudentIds.length} seat(s)`
                  )}
                </Button>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant={selectionMode ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={toggleShuffleSelectionMode}
                    aria-pressed={selectionMode}
                  >
                    <UserMinus className="h-4 w-4" />
                    <span className="ml-2 hidden sm:inline">{selectionMode ? 'Done' : 'Shuffle'}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  Select students and free their company seats so you can route someone else when a seat becomes available.
                </TooltipContent>
              </Tooltip>
              <Button variant="outline" size="sm" onClick={() => void loadCandidates()} disabled={loadingCandidates}>
                {loadingCandidates ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                <span className="ml-2">Refresh</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingCandidates && candidates.length === 0 ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : candidates.length === 0 ? (
              <p className="text-sm text-muted-foreground">No student records found.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    {selectionMode ? (
                      <TableHead className="w-10 pl-3">
                        {allocatedStudentIds.length > 0 ? (
                          <Checkbox
                            checked={allAllocatedSelected}
                            onCheckedChange={() => toggleSelectAllAllocated()}
                            aria-label="Select all students currently allocated to a company seat"
                          />
                        ) : null}
                      </TableHead>
                    ) : null}
                    <TableHead>Student</TableHead>
                    <TableHead>ID / Program</TableHead>
                    <TableHead>Priority applications</TableHead>
                    <TableHead>Replacement queue</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {candidates.map((c) => (
                    <TableRow key={c.studentUserId}>
                      {selectionMode ? (
                        <TableCell className="w-10 pl-3 align-middle">
                          <Checkbox
                            checked={selectedStudentIds.includes(c.studentUserId)}
                            onCheckedChange={() => toggleStudentRowSelected(c.studentUserId)}
                            aria-label={`Select ${c.name}`}
                          />
                        </TableCell>
                      ) : null}
                      <TableCell>
                        <div className="font-medium">{c.name}</div>
                        <div className="text-xs text-muted-foreground">{c.email}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{c.studentId}</div>
                        <div className="text-xs text-muted-foreground">
                          CGPA{' '}
                          {c.cgpa != null && !Number.isNaN(Number(c.cgpa)) ? Number(c.cgpa).toFixed(2) : '—'} ·{' '}
                          {c.specialization}
                        </div>
                      </TableCell>
                      <TableCell>
                        {c.priorityApplications.length === 0 ? (
                          <span className="text-sm text-muted-foreground">—</span>
                        ) : (
                          <ul className="space-y-1 text-sm">
                            {c.priorityApplications.map((p) => (
                              <li key={p.id} className="flex flex-wrap items-center gap-1">
                                <span className="text-muted-foreground">{p.companyName}</span>
                                <span className="text-xs">· {formatPrioritySummary(p)}</span>
                                {p.terminal ? (
                                  <Badge variant="outline" className="text-xs">
                                    closed
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-xs">
                                    active
                                  </Badge>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </TableCell>
                      <TableCell>
                        {c.replacementApplications.length === 0 ? (
                          <span className="text-sm text-muted-foreground">None yet</span>
                        ) : (
                          <ul className="space-y-1 text-sm">
                            {c.replacementApplications.map((r) => (
                              <li key={r.id} className="space-y-1">
                                <div>
                                  {r.companyName} · <span className="text-muted-foreground">{r.status}</span>
                                </div>
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline disabled:opacity-50"
                                  disabled={backfillingId === r.id}
                                  onClick={() => void handleBackfillPriorityDocuments(r.id)}
                                >
                                  {backfillingId === r.id ? (
                                    <>
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                      Attaching…
                                    </>
                                  ) : (
                                    'Pull CV from priority applications'
                                  )}
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {!c.canReplace && c.eligibilityReason ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex">
                                  <Button size="sm" disabled onClick={() => undefined}>
                                    Replace
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p>{c.eligibilityReason}</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <Button size="sm" disabled={!c.canReplace} onClick={() => openRoutingDialog(c, 'replace')}>
                              Replace
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={String(c.currentStatus || '').toLowerCase() === 'completed'}
                            title={
                              String(c.currentStatus || '').toLowerCase() === 'completed'
                                ? 'Change is disabled after SIT completion'
                                : undefined
                            }
                            onClick={() => openRoutingDialog(c, 'change')}
                          >
                            Change
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Live vacancies (reference)</CardTitle>
            <CardDescription>
              All internships with free seats. The Replace dialog also lists companies at full capacity (no free seats) so you can
              see where students are seated before you shuffle. Per-student routing still hides employers that rejected that student
              on standard applications.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingVacancies && vacancies.length === 0 ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : vacancies.length === 0 ? (
              <p className="text-sm text-muted-foreground">No internships with free seats right now.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Seats</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vacancies.slice(0, 15).map((v) => (
                    <TableRow key={v.internshipId}>
                      <TableCell className="font-medium">{v.companyName}</TableCell>
                      <TableCell>{v.title}</TableCell>
                      <TableCell>
                        {v.vacantSeats} free ({v.seatsFilled}/{v.seats})
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{v.internshipStatus}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {vacancies.length > 15 && (
              <p className="mt-2 text-xs text-muted-foreground">
                Showing 15 of {vacancies.length}. The Replace dialog loads a tailored list per student (with exclusions applied).
              </p>
            )}
          </CardContent>
        </Card>

        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setSelectedStudent(null);
              setDialogVacancies([]);
              setVacancySearch('');
            }
          }}
        >
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{flowMode === 'change' ? 'Route company change request' : 'Route replacement application'}</DialogTitle>
              <DialogDescription>
                {selectedStudent ? (
                  <>
                    CV, academic profile, and uploaded documents are attached automatically for{' '}
                    <strong>{selectedStudent.name}</strong>. Companies that rejected them on either standard application are hidden
                    from the submit list. Openings with seats are listed first; companies at full capacity appear for reference.
                    Deadlines and posted CGPA limits are bypassed for this flow.{' '}
                    {flowMode === 'change'
                      ? 'After new company accepts and uploads acceptance letter, student is auto-transferred from old company.'
                      : ''}
                  </>
                ) : null}
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 p-3 text-sm">
              <Info className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span>
                Submitting creates a normal pending application for the company focal. Employers that already declined this student
                in the priority phase do not appear here. Rows marked full have no free seat — use Shuffle on the student table to
                free a seat first, then submit here.
              </span>
            </div>

            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Filter by company, title, or location…"
                value={vacancySearch}
                onChange={(e) => setVacancySearch(e.target.value)}
              />
            </div>

            {loadingDialogVacancies && dialogVacancies.length === 0 ? (
              <div className="flex justify-center py-8 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead className="text-right">Submit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDialogVacancies.map((v) => {
                    const busy = submittingId === v.internshipId;
                    const isFull = Boolean(v.isFull) || v.vacantSeats <= 0;
                    return (
                      <TableRow key={v.internshipId} className={isFull ? 'bg-muted/30' : undefined}>
                        <TableCell className="font-medium">{v.companyName}</TableCell>
                        <TableCell>
                          <div>{v.title}</div>
                          <div className="text-xs text-muted-foreground">{v.duration}</div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{v.location || '—'}</TableCell>
                        <TableCell>
                          {isFull ? (
                            <div className="flex flex-wrap items-center gap-1">
                              <Badge variant="outline" className="text-xs">
                                Full
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {v.seatsFilled}/{v.seats} filled
                              </span>
                            </div>
                          ) : (
                            <Badge variant="secondary">{v.vacantSeats} free</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isFull ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex">
                                  <Button
                                    size="sm"
                                    onClick={() => void handleSubmitToCompany(v)}
                                    disabled
                                    aria-disabled
                                  >
                                    Submit here
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                No vacant seat. Free a seat with Shuffle, then try again.
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => void handleSubmitToCompany(v)}
                              disabled={busy || (flowMode === 'replace' && !selectedStudent?.canReplace)}
                            >
                              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit here'}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}

            {filteredDialogVacancies.length === 0 && !loadingDialogVacancies && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {vacancySearch.trim()
                  ? 'No matching openings in the filtered list.'
                  : 'No eligible companies in this list — every opening may have been excluded because this student was rejected there on a priority application, or there are no postings.'}
              </p>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
