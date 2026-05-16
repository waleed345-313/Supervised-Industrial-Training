import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { RefreshCw } from 'lucide-react';

type Props = {
  eligible: boolean | null;
  loading?: boolean;
};

/**
 * Inform students when Placement Office replacement routing applies (submission still manager-only).
 */
export function ReplacementStudentCallout({ eligible, loading }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);

  if (loading || eligible !== true) return null;

  return (
    <>
      <div className="mb-4 rounded-lg border border-amber-500/35 bg-amber-500/[0.08] px-4 py-3 dark:bg-amber-500/10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="flex items-center gap-2 text-sm font-medium text-amber-950 dark:text-amber-100">
              <RefreshCw className="h-4 w-4 shrink-0" />
              Placement support — replacement routing
            </p>
            <p className="text-sm text-muted-foreground">
              Both of your standard applications are closed without placement. You are eligible for the Placement Office to
              submit a replacement application to companies that still have open seats (including roles past deadline or posted
              CGPA rules).
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="shrink-0 border-amber-500/40 bg-amber-100/90 text-amber-950 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-50 dark:hover:bg-amber-950/60"
            onClick={() => setDialogOpen(true)}
          >
            Replace
          </Button>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>How replacement placement works</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 pt-2 text-sm text-muted-foreground">
                <p>
                  The <strong>Replace</strong> action is handled by your <strong>Placement Office</strong> from the{' '}
                  <strong>Replacement Management</strong> screen. They can attach your profile and documents and send an
                  application to a company that has remaining capacity.
                </p>
                <p>If you believe you are eligible but need help sooner, contact the Placement Office directly.</p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="default" onClick={() => setDialogOpen(false)}>
              Understood
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
