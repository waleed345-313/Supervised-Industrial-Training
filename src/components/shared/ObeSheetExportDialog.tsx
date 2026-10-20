import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type ObeSheetExportOptions = {
  title: string;
  instructor: string;
  semester: string;
};

type SitProgram = 'SIT-1' | 'SIT-2';
type BsietClass = 'BSIET-7' | 'BSIET-8';
type TermSeason = 'Spring' | 'Fall';

function buildYearOptions(from: number, to: number) {
  const years: number[] = [];
  for (let y = to; y >= from; y -= 1) years.push(y);
  return years;
}

function buildObeSheetMeta(form: {
  sitProgram: SitProgram;
  batchYear: string;
  instructor: string;
  bsietClass: BsietClass;
  termSeason: TermSeason;
  termYear: string;
}): ObeSheetExportOptions {
  return {
    title: `IET ${form.sitProgram} (Batch ${form.batchYear})`,
    instructor: form.instructor.trim(),
    semester: `${form.bsietClass} (${form.termSeason} ${form.termYear})`,
  };
}

type ObeSheetExportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exporting: boolean;
  onExport: (options: ObeSheetExportOptions) => void | Promise<void>;
};

export function ObeSheetExportDialog({
  open,
  onOpenChange,
  exporting,
  onExport,
}: ObeSheetExportDialogProps) {
  const currentYear = new Date().getFullYear();
  const batchYears = useMemo(() => buildYearOptions(2015, currentYear + 1), [currentYear]);
  const termYears = useMemo(() => buildYearOptions(currentYear - 2, currentYear + 2), [currentYear]);

  const [sitProgram, setSitProgram] = useState<SitProgram>('SIT-2');
  const [batchYear, setBatchYear] = useState('2021');
  const [instructor, setInstructor] = useState('Usman Ahmed');
  const [bsietClass, setBsietClass] = useState<BsietClass>('BSIET-8');
  const [termSeason, setTermSeason] = useState<TermSeason>('Spring');
  const [termYear, setTermYear] = useState('2025');

  const preview = buildObeSheetMeta({
    sitProgram,
    batchYear,
    instructor,
    bsietClass,
    termSeason,
    termYear,
  });

  const canExport = instructor.trim().length > 0 && batchYear && termYear;

  const handleExport = () => {
    if (!canExport || exporting) return;
    void onExport(preview);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Export OBE Sheet</DialogTitle>
          <DialogDescription>
            Choose sheet details before generating the PDF. Students from the Completed final grading list are
            included.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="obe-sit-program">SIT program</Label>
            <Select value={sitProgram} onValueChange={(v) => setSitProgram(v as SitProgram)}>
              <SelectTrigger id="obe-sit-program">
                <SelectValue placeholder="Select SIT program" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SIT-1">SIT-1</SelectItem>
                <SelectItem value="SIT-2">SIT-2</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="obe-batch-year">Batch (year)</Label>
            <Select value={batchYear} onValueChange={setBatchYear}>
              <SelectTrigger id="obe-batch-year">
                <SelectValue placeholder="Select batch year" />
              </SelectTrigger>
              <SelectContent>
                {batchYears.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="obe-instructor">Instructor name</Label>
            <Input
              id="obe-instructor"
              value={instructor}
              onChange={(e) => setInstructor(e.target.value)}
              placeholder="Enter instructor name"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="obe-bsiet-class">Class and semester</Label>
            <Select value={bsietClass} onValueChange={(v) => setBsietClass(v as BsietClass)}>
              <SelectTrigger id="obe-bsiet-class">
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BSIET-7">BSIET-7</SelectItem>
                <SelectItem value="BSIET-8">BSIET-8</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="obe-term-season">Term</Label>
              <Select value={termSeason} onValueChange={(v) => setTermSeason(v as TermSeason)}>
                <SelectTrigger id="obe-term-season">
                  <SelectValue placeholder="Spring or Fall" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Spring">Spring</SelectItem>
                  <SelectItem value="Fall">Fall</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="obe-term-year">Year</Label>
              <Select value={termYear} onValueChange={setTermYear}>
                <SelectTrigger id="obe-term-year">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {termYears.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">PDF title preview: </span>
            {preview.title}
            {preview.instructor ? ` — Instructor: ${preview.instructor}` : ''}
            {preview.semester ? ` — Class and Semester: ${preview.semester}` : ''}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={exporting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleExport} disabled={!canExport || exporting}>
            {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Export PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
