import { Badge } from "@/components/ui/badge";
import {
  gradeBadgeVariant,
  internalMarksToPercent,
  letterGradeFromInternalOutOf50,
} from "@/lib/panelGrading";

type FinalGradingInternalSummaryCardProps = {
  internalOutOf50: number;
};

export function FinalGradingInternalSummaryCard({
  internalOutOf50,
}: FinalGradingInternalSummaryCardProps) {
  const pct = internalMarksToPercent(internalOutOf50);
  const letter = letterGradeFromInternalOutOf50(internalOutOf50);

  return (
    <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm">
      <div className="flex justify-between items-baseline gap-2">
        <span className="font-medium">Your internal marks</span>
        <span className="text-xl font-bold tabular-nums">{internalOutOf50.toFixed(2)}/50</span>
      </div>
      <div className="flex justify-between items-center gap-2">
        <span className="text-muted-foreground">Percentage</span>
        <span className="font-medium tabular-nums">{pct.toFixed(1)}%</span>
      </div>
      <div className="flex justify-between items-center gap-2">
        <span className="text-muted-foreground">Grade</span>
        <Badge variant={gradeBadgeVariant(letter)} className="text-sm font-semibold">
          {letter}
        </Badge>
      </div>
    </div>
  );
}
