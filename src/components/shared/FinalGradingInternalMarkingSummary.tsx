import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  clampHandlingOfQuestions,
  gradeBadgeVariant,
  internalMarksToPercent,
  letterGradeFromInternalOutOf50,
  type InternalRubricMarks,
  presentationAverageFromRubrics,
} from "@/lib/panelGrading";

type FinalGradingInternalMarkingSummaryProps = {
  marks: InternalRubricMarks;
};

export function FinalGradingInternalMarkingSummary({
  marks,
}: FinalGradingInternalMarkingSummaryProps) {
  const hoq = clampHandlingOfQuestions(marks.handlingOfQuestions);
  const presentationAvg = presentationAverageFromRubrics(marks);
  const internalTotal =
    presentationAvg +
    hoq +
    marks.modernToolUsage +
    marks.ethics +
    marks.reportScore;
  const internalPercent = internalMarksToPercent(internalTotal);
  const letterGrade = letterGradeFromInternalOutOf50(internalTotal);

  return (
    <div className="p-4 bg-muted rounded-lg space-y-3">
      <div className="grid grid-cols-2 gap-2 text-sm">
        <span>Presentation average:</span>
        <span className="text-right font-medium tabular-nums">{presentationAvg.toFixed(2)}/10</span>
        <span>Handling of Questions:</span>
        <span className="text-right font-medium tabular-nums">{hoq}/20</span>
        <span>Modern Tool Usage:</span>
        <span className="text-right font-medium tabular-nums">{marks.modernToolUsage}/5</span>
        <span>Ethics:</span>
        <span className="text-right font-medium tabular-nums">{marks.ethics}/5</span>
        <span>Report score:</span>
        <span className="text-right font-medium tabular-nums">{marks.reportScore}/10</span>
      </div>
      <Separator />
      <div className="flex justify-between items-center gap-2">
        <div>
          <span className="font-semibold">Your internal total</span>
          <p className="text-xs text-muted-foreground mt-0.5">
            {internalPercent.toFixed(1)}% · Grade {letterGrade}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xl font-bold tabular-nums">{internalTotal.toFixed(2)}/50</span>
          <Badge variant={gradeBadgeVariant(letterGrade)}>{letterGrade}</Badge>
        </div>
      </div>
    </div>
  );
}
