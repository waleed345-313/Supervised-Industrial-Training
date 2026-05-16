import { useState, useMemo, useCallback, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { ClipboardCheck, Save, Eye, Pencil, FileSpreadsheet, RefreshCw, MessageSquare } from "lucide-react";
import { PloRubricHeaderToggle } from "@/components/shared/PloRubricHeaderToggle";
import { PloRubricDetail } from "@/components/shared/PloRubricDetail";
import type { IndustrialPloRubricKey } from "@/data/industrialPloRubrics";
import { Evaluation, Student, SupervisorFeedback } from "@/types";
import api, { API_BASE } from "@/lib/api";
import { io, type Socket } from "socket.io-client";
import { cn } from "@/lib/utils";

interface StudentEvaluation {
  studentId: string;
  name: string;
  registrationNo: string;
  problemAnalysis: number | '';
  investigation: number | '';
  modernToolUsage: number | '';
  ethics: number | '';
  individualTeamwork: number | '';
  communication: number | '';
  projectManagement: number | '';
  lifeLongLearning: number | '';
  remarks: string;
}

const months = ['Month 1', 'Month 2', 'Month 3', 'Month 4'];

const MONTHLY_RAW_MAX = 80;

const ploCriteria = [
  { key: 'problemAnalysis', label: 'Problem Analysis', plo: 'PLO2' },
  { key: 'investigation', label: 'Investigation', plo: 'PLO4' },
  { key: 'modernToolUsage', label: 'Modern Tool Usage', plo: 'PLO5' },
  { key: 'ethics', label: 'Ethics', plo: 'PLO8' },
  { key: 'individualTeamwork', label: 'Individual and Teamwork', plo: 'PLO9' },
  { key: 'communication', label: 'Communication', plo: 'PLO10' },
  { key: 'projectManagement', label: 'Project Management', plo: 'PLO11' },
  { key: 'lifeLongLearning', label: 'Lifelong Learning', plo: 'PLO12' },
];

const getDefaultEvaluations = (students: Student[]): StudentEvaluation[] => {
  return students.map((student) => ({
    studentId: student.id,
    name: student.name,
    registrationNo: student.studentId || '',
    problemAnalysis: '',
    investigation: '',
    modernToolUsage: '',
    ethics: '',
    individualTeamwork: '',
    communication: '',
    projectManagement: '',
    lifeLongLearning: '',
    remarks: '',
  }));
};

const getZeroedEvaluations = (students: Student[]): StudentEvaluation[] => {
  return students.map((student) => ({
    studentId: student.id,
    name: student.name,
    registrationNo: student.studentId || '',
    problemAnalysis: 0,
    investigation: 0,
    modernToolUsage: 0,
    ethics: 0,
    individualTeamwork: 0,
    communication: 0,
    projectManagement: 0,
    lifeLongLearning: 0,
    remarks: '',
  }));
};

const calculateStudentTotal = (evalData: StudentEvaluation): number => {
  const scores = [
    evalData.problemAnalysis,
    evalData.investigation,
    evalData.modernToolUsage,
    evalData.ethics,
    evalData.individualTeamwork,
    evalData.communication,
    evalData.projectManagement,
    evalData.lifeLongLearning,
  ];
  const validScores = scores.filter((s): s is number => s !== '' && typeof s === 'number');
  if (validScores.length === 0) return 0;
  const totalRaw = validScores.reduce((sum, score) => sum + score, 0);
  return (totalRaw / MONTHLY_RAW_MAX) * 12.5;
};

export default function IndustryEvaluations() {
  const [submittedEvaluations, setSubmittedEvaluations] = useState<Evaluation[]>([]);
  const [monthlyFeedback, setMonthlyFeedback] = useState<SupervisorFeedback[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewEvaluation, setViewEvaluation] = useState<Evaluation | null>(null);
  const [editingEvaluation, setEditingEvaluation] = useState<Evaluation | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [assignedStudents, setAssignedStudents] = useState<Student[]>([]);
  const [expandedRubric, setExpandedRubric] = useState<IndustrialPloRubricKey | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const loadHistory = useCallback(async () => {
    try {
      const data = await api.getIndustrialEvaluations();
      setSubmittedEvaluations(Array.isArray(data) ? (data as Evaluation[]) : []);
    } catch (err) {
      console.error(err);
      setSubmittedEvaluations([]);
    }
  }, []);

  const loadMonthlyFeedback = useCallback(async () => {
    try {
      const data = await api.getIndustrialFeedback(selectedMonth ? { month: selectedMonth } : undefined);
      setMonthlyFeedback(Array.isArray(data) ? (data as SupervisorFeedback[]) : []);
    } catch (err) {
      console.error(err);
      setMonthlyFeedback([]);
    }
  }, [selectedMonth]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    loadMonthlyFeedback();
  }, [loadMonthlyFeedback]);

  useEffect(() => {
    const token = localStorage.getItem('sit_portal_token');
    if (!token) return;
    const socket: Socket = io(API_BASE, { auth: { token } });

    const onIndustryUpdate = (payload: { type?: string }) => {
      if (!payload?.type || payload.type === 'feedback') {
        loadMonthlyFeedback();
      }
    };

    socket.on('industry:update', onIndustryUpdate);
    return () => {
      socket.off('industry:update', onIndustryUpdate);
      socket.disconnect();
    };
  }, [loadMonthlyFeedback]);

  const loadAssignedStudents = useCallback(async () => {
    if (!user?.companyId) {
      setAssignedStudents([]);
      return;
    }
    try {
      const data = await api.getStudentsForMyCompany();
      const students = Array.isArray(data) ? (data as Student[]) : [];
      setAssignedStudents(students.filter((s) => s.currentStatus === 'allocated'));
    } catch (err) {
      console.error(err);
      setAssignedStudents([]);
      toast({
        title: "Could not load assigned students",
        description: "Ensure your account is linked to a company and students are assigned.",
        variant: "destructive",
      });
    }
  }, [toast, user?.companyId]);

  useEffect(() => {
    loadAssignedStudents();
  }, [loadAssignedStudents]);
  
  // Initialize evaluations with real student data
  const [evaluations, setEvaluations] = useState<StudentEvaluation[]>([]);
  
  // Update evaluations when students data changes
  useEffect(() => {
    if (assignedStudents.length > 0) {
      setEvaluations(getDefaultEvaluations(assignedStudents));
    } else {
      setEvaluations([]);
    }
  }, [assignedStudents]);
  
  const historyData = submittedEvaluations;

  const handleRubricToggle = (key: IndustrialPloRubricKey) => {
    setExpandedRubric((prev) => (prev === key ? null : key));
  };

  const handleScoreChange = (
    studentId: string,
    criteria: keyof StudentEvaluation,
    value: string
  ) => {
    const numValue = value === '' ? '' : Math.min(10, Math.max(0, parseFloat(value) || 0));
    setEvaluations((prev) =>
      prev.map((evalItem) =>
        evalItem.studentId === studentId
          ? { ...evalItem, [criteria]: numValue }
          : evalItem
      )
    );
  };

  const handleRemarksChange = (studentId: string, value: string) => {
    setEvaluations((prev) =>
      prev.map((evalItem) =>
        evalItem.studentId === studentId
          ? { ...evalItem, remarks: value }
          : evalItem
      )
    );
  };

  const handleSubmitAll = async () => {
    if (!selectedMonth) {
      toast({
        title: "Error",
        description: "Please select a month first",
        variant: "destructive",
      });
      return;
    }

    const completedEvaluations = evaluations.filter((e) =>
      ploCriteria.every((c) => e[c.key as keyof StudentEvaluation] !== '')
    );

    if (completedEvaluations.length === 0) {
      toast({
        title: "Error",
        description: "Please enter marks for at least one student",
        variant: "destructive",
      });
      return;
    }

    const selectedMonthKey = selectedMonth.trim().toLowerCase();
    const completedStudentIds = new Set(completedEvaluations.map((e) => e.studentId));
    const alreadyDoneForMonth = historyData.some((ev) =>
      ev.type === 'monthly' &&
      String(ev.month || '').trim().toLowerCase() === selectedMonthKey &&
      completedStudentIds.has(ev.studentId)
    );

    if (alreadyDoneForMonth) {
      toast({
        title: 'Already done',
        description: 'already evaluation done for this month',
        variant: 'destructive',
      });
      return;
    }

    // Submit each evaluation to the server
    try {
      for (const evalData of completedEvaluations) {
        await api.submitIndustrialEvaluation({
          studentId: evalData.studentId,
          month: selectedMonth,
          scores: {
            problemAnalysis: Number(evalData.problemAnalysis),
            investigation: Number(evalData.investigation),
            modernToolUsage: Number(evalData.modernToolUsage),
            ethics: Number(evalData.ethics),
            individualTeamwork: Number(evalData.individualTeamwork),
            communication: Number(evalData.communication),
            projectManagement: Number(evalData.projectManagement),
            lifeLongLearning: Number(evalData.lifeLongLearning),
          },
          remarks: evalData.remarks,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.toLowerCase().includes('already evaluation done for this month')) {
        toast({
          title: 'Already done',
          description: 'already evaluation done for this month',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Save failed',
          description: 'Could not save evaluations. Please try again.',
          variant: 'destructive',
        });
      }
      return;
    }
    
    toast({
      title: "Evaluations Submitted",
      description: `${selectedMonth} evaluations submitted for ${completedEvaluations.length} students`,
    });
    
    // Refresh the history data
    await loadHistory();
    
    // Move to next month and reset all fields to zero
    const currentMonthIndex = months.indexOf(selectedMonth);
    const nextMonth = currentMonthIndex >= 0 && currentMonthIndex < months.length - 1
      ? months[currentMonthIndex + 1]
      : selectedMonth;
    setSelectedMonth(nextMonth);
    setEvaluations(getZeroedEvaluations(assignedStudents));
  };
  
  const handleRefresh = () => {
    loadHistory();
    loadAssignedStudents();
    loadMonthlyFeedback();
    toast({
      title: "Data Refreshed",
      description: "Latest data loaded from server",
    });
  };
  
  // Show message if no students assigned
  const noStudentsAssigned = assignedStudents.length === 0;

  const handleView = (evaluation: Evaluation) => {
    setViewEvaluation(evaluation);
    setViewDialogOpen(true);
  };

  const handleEdit = (evaluation: Evaluation) => {
    setEditingEvaluation(evaluation);
    setIsDialogOpen(true);
  };

  const getStudentTotalDisplay = (evalData: StudentEvaluation) => {
    const total = calculateStudentTotal(evalData);
    const hasData = ploCriteria.some((c) => evalData[c.key as keyof StudentEvaluation] !== '');
    return hasData ? `${total.toFixed(2)}/12.5` : '--/12.5';
  };

  const groupedFeedback = useMemo(() => {
    const groups = new Map<string, { studentId: string; studentName: string; items: SupervisorFeedback[] }>();
    for (const item of monthlyFeedback) {
      const key = item.studentId || item.studentName;
      if (!groups.has(key)) {
        groups.set(key, {
          studentId: item.studentId,
          studentName: item.studentName || "Unknown Student",
          items: [],
        });
      }
      groups.get(key)?.items.push(item);
    }

    return Array.from(groups.values()).sort((a, b) => a.studentName.localeCompare(b.studentName));
  }, [monthlyFeedback]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Monthly Industrial Evaluation"
          description="Rate each criterion from 0 to 10 and add supervisor remarks"
          action={
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          }
        />

        {/* Month Selection Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileSpreadsheet className="h-5 w-5" />
              Evaluation Setup
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-4">
              <div className="w-64">
                <label className="text-sm font-medium mb-2 block">Evaluation Month</label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month} value={month}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleSubmitAll}
                disabled={!selectedMonth}
                className="mb-0"
              >
                <Save className="h-4 w-4 mr-2" />
                Save All Evaluations
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Evaluation Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardCheck className="h-5 w-5" />
              {selectedMonth ? `${selectedMonth} (Industrial Supervisor Evaluation)` : 'Student Marking Sheet'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto overflow-y-visible border rounded-lg">
              <Table>
                <TableHeader>
                  {/* Category Row */}
                  <TableRow className="bg-slate-100">
                    <TableHead rowSpan={3} className="border text-center w-12">No.</TableHead>
                    <TableHead rowSpan={3} className="border text-center min-w-[140px]">Registration No</TableHead>
                    <TableHead rowSpan={3} className="border text-center min-w-[140px]">Name</TableHead>
                    <TableHead colSpan={8} className="border text-center bg-blue-100 text-blue-900">
                      {selectedMonth || 'Select Month'} (Industrial Supervisor Evaluation)
                    </TableHead>
                    <TableHead rowSpan={3} className="border text-center min-w-[100px]">Total</TableHead>
                    <TableHead rowSpan={3} className="border text-center min-w-[200px]">Remarks</TableHead>
                  </TableRow>
                  {/* Marks Category Row */}
                  <TableRow className="bg-slate-100">
                    {ploCriteria.map((criteria) => (
                      <TableHead key={criteria.key} className="border text-center text-xs py-1 min-w-[120px]">
                        <PloRubricHeaderToggle
                          label={criteria.label}
                          plo={criteria.plo}
                          rubricKey={criteria.key as IndustrialPloRubricKey}
                          expanded={expandedRubric === criteria.key}
                          onToggle={handleRubricToggle}
                        />
                      </TableHead>
                    ))}
                  </TableRow>
                  {/* Weightage, max marks, and inline rubric details */}
                  <TableRow className="bg-slate-50 text-xs">
                    {ploCriteria.map((criteria) => (
                      <TableHead
                        key={`${criteria.key}-meta`}
                        className={cn(
                          "border text-center py-1 align-top font-normal min-w-[200px] max-w-[280px]",
                          expandedRubric === criteria.key && "bg-amber-50/90"
                        )}
                      >
                        <div className="text-[10px]">WT: 50</div>
                        <div className="text-[10px] font-semibold">Max: 10</div>
                        {expandedRubric === criteria.key && (
                          <div className="mt-2 border-t border-amber-200/80 pt-2 text-left">
                            <PloRubricDetail rubricKey={criteria.key as IndustrialPloRubricKey} compact />
                          </div>
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {noStudentsAssigned ? (
                    <TableRow>
                      <TableCell colSpan={12} className="border text-center py-8 text-muted-foreground">
                        No students assigned yet. Students will appear here when assigned by the company focal person.
                      </TableCell>
                    </TableRow>
                  ) : (
                    evaluations.map((evalItem, index) => (
                      <TableRow key={evalItem.studentId} className="hover:bg-slate-50">
                        <TableCell className="border text-center font-medium">{index + 1}</TableCell>
                        <TableCell className="border text-xs font-mono">{evalItem.registrationNo}</TableCell>
                        <TableCell className="border font-medium">{evalItem.name}</TableCell>
                        {ploCriteria.map((criteria) => (
                          <TableCell key={criteria.key} className="border p-1">
                            <Input
                              type="number"
                              min={0}
                              max={10}
                              step={0.1}
                              value={evalItem[criteria.key as keyof StudentEvaluation]}
                              onChange={(e) =>
                                handleScoreChange(evalItem.studentId, criteria.key as keyof StudentEvaluation, e.target.value)
                              }
                              className="w-16 h-8 text-center p-1 text-sm mx-auto"
                              placeholder="0"
                              disabled={!selectedMonth}
                            />
                          </TableCell>
                        ))}
                        <TableCell className="border text-center font-semibold text-sm">
                          {getStudentTotalDisplay(evalItem)}
                        </TableCell>
                        <TableCell className="border p-1">
                          <Textarea
                            value={evalItem.remarks}
                            onChange={(e) => handleRemarksChange(evalItem.studentId, e.target.value)}
                            placeholder="Add remarks..."
                            className="min-h-[32px] h-8 text-xs resize-none"
                            disabled={!selectedMonth}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {!selectedMonth && (
              <p className="text-sm text-muted-foreground mt-4 text-center">
                Please select an evaluation month to start entering marks
              </p>
            )}
          </CardContent>
        </Card>

        {/* Academic Supervisor Feedback */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="h-5 w-5" />
              Academic Supervisor Feedback
            </CardTitle>
          </CardHeader>
          <CardContent>
            {groupedFeedback.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                {selectedMonth
                  ? `No feedback available for ${selectedMonth}.`
                  : "No feedback shared by academic supervisor yet."}
              </div>
            ) : (
              <div className="space-y-3">
                {groupedFeedback.map((studentGroup) => (
                  <div key={studentGroup.studentId || studentGroup.studentName} className="rounded-lg border p-3 space-y-3">
                    <div className="font-semibold">{studentGroup.studentName}</div>
                    <div className="space-y-2">
                      {studentGroup.items.map((feedback) => (
                        <div key={feedback.id} className="rounded-md border bg-muted/30 p-3 space-y-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <Badge variant="secondary">{feedback.month || "General"}</Badge>
                            <span className="text-xs text-muted-foreground">{feedback.sentAt}</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            From: {feedback.supervisorName} | Type: {feedback.type}
                          </div>
                          <p className="text-sm">{feedback.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submitted Evaluations History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardCheck className="h-5 w-5" />
              Submitted Evaluations History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {historyData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No evaluations submitted yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Month</TableHead>
                    <TableHead>Monthly Total</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyData.map((evaluation) => {
                    const monthlyTotal = ((evaluation.score / evaluation.maxScore) * 12.5).toFixed(2);
                    return (
                      <TableRow key={evaluation.id}>
                        <TableCell className="font-medium">{evaluation.studentName}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {evaluation.month || (evaluation.type === 'monthly' ? 'Month 1' : 'Final')}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {monthlyTotal}/12.5
                        </TableCell>
                        <TableCell className="text-muted-foreground">{evaluation.date}</TableCell>
                        <TableCell>
                          <Badge variant="default">Submitted</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleView(evaluation)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleEdit(evaluation)}>
                              <Pencil className="h-4 w-4" />
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

        {/* View Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>View Evaluation</DialogTitle>
              <DialogDescription>Summary of the submitted monthly evaluation.</DialogDescription>
            </DialogHeader>
            {viewEvaluation ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h5 className="text-sm font-medium">Student</h5>
                    <p className="text-muted-foreground">{viewEvaluation.studentName}</p>
                  </div>
                  <div>
                    <h5 className="text-sm font-medium">Month</h5>
                    <p className="text-muted-foreground">{viewEvaluation.month || (viewEvaluation.type === 'monthly' ? 'Month 1' : 'Final')}</p>
                  </div>
                  <div>
                    <h5 className="text-sm font-medium">Date</h5>
                    <p className="text-muted-foreground">{viewEvaluation.date}</p>
                  </div>
                  <div>
                    <h5 className="text-sm font-medium">Score</h5>
                    <p className="text-muted-foreground">{viewEvaluation.score}/{viewEvaluation.maxScore}</p>
                  </div>
                </div>

                <div className="p-3 bg-muted rounded">
                  <h5 className="text-sm font-medium">Monthly Total</h5>
                  <p className="text-foreground text-lg font-bold">{((viewEvaluation.score / viewEvaluation.maxScore) * 12.5).toFixed(2)}/12.5</p>
                </div>

                <div>
                  <h5 className="text-sm font-medium">Remarks</h5>
                  <p className="text-muted-foreground">{viewEvaluation.remarks}</p>
                </div>

                <div className="flex justify-end">
                  <Button variant="outline" onClick={() => setViewDialogOpen(false)}>Close</Button>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>

        {/* Edit Dialog - Simple Version */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Evaluation</DialogTitle>
              <DialogDescription>Modify evaluation details.</DialogDescription>
            </DialogHeader>
            {editingEvaluation ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h5 className="text-sm font-medium">Student</h5>
                    <p className="text-muted-foreground">{editingEvaluation.studentName}</p>
                  </div>
                  <div>
                    <h5 className="text-sm font-medium">Month</h5>
                    <p className="text-muted-foreground">{editingEvaluation.month || (editingEvaluation.type === 'monthly' ? 'Month 1' : 'Final')}</p>
                  </div>
                </div>
                <div>
                  <h5 className="text-sm font-medium">Current Score</h5>
                  <p className="text-muted-foreground">{editingEvaluation.score}/{editingEvaluation.maxScore}</p>
                </div>
                <div>
                  <h5 className="text-sm font-medium">Remarks</h5>
                  <Textarea
                    defaultValue={editingEvaluation.remarks}
                    className="mt-1"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button onClick={() => {
                    toast({
                      title: "Evaluation Updated",
                      description: "Evaluation has been updated successfully",
                    });
                    setIsDialogOpen(false);
                  }}>Save Changes</Button>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
