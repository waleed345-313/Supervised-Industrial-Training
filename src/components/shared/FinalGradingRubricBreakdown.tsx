import { clampHandlingOfQuestions } from "@/lib/panelGrading";

type RubricSource = {
  content?: number;
  visuals?: number;
  presentationSkills?: number;
  organization?: number;
  handlingOfQuestions?: number;
  modernToolUsage?: number;
  ethics?: number;
  reportScore?: number;
};

type FinalGradingRubricBreakdownProps = {
  source: RubricSource;
  className?: string;
};

export function FinalGradingRubricBreakdown({
  source,
  className,
}: FinalGradingRubricBreakdownProps) {
  return (
    <div className={`grid grid-cols-2 gap-2 text-sm rounded-lg border p-3 ${className ?? ""}`}>
      <span className="text-muted-foreground">Content</span>
      <span className="text-right tabular-nums font-medium">{source.content?.toFixed(2) ?? "—"}/10</span>
      <span className="text-muted-foreground">Visuals</span>
      <span className="text-right tabular-nums font-medium">{source.visuals?.toFixed(2) ?? "—"}/10</span>
      <span className="text-muted-foreground">Presentation skills</span>
      <span className="text-right tabular-nums font-medium">
        {source.presentationSkills?.toFixed(2) ?? "—"}/10
      </span>
      <span className="text-muted-foreground">Organization</span>
      <span className="text-right tabular-nums font-medium">
        {source.organization?.toFixed(2) ?? "—"}/10
      </span>
      <span className="text-muted-foreground">Handling of Questions</span>
      <span className="text-right tabular-nums font-medium">
        {clampHandlingOfQuestions(source.handlingOfQuestions, 0).toFixed(2)}/20
      </span>
      <span className="text-muted-foreground">Modern Tool Usage</span>
      <span className="text-right tabular-nums font-medium">
        {(source.modernToolUsage ?? 0).toFixed(2)}/5
      </span>
      <span className="text-muted-foreground">Ethics</span>
      <span className="text-right tabular-nums font-medium">{(source.ethics ?? 0).toFixed(2)}/5</span>
      <span className="text-muted-foreground">Report</span>
      <span className="text-right tabular-nums font-medium">{source.reportScore?.toFixed(2) ?? "—"}/10</span>
    </div>
  );
}
