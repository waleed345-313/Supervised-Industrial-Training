import {
  FINAL_GRADING_RUBRICS,
  type FinalGradingRubricKey,
} from "@/data/finalGradingRubrics";
import { cn } from "@/lib/utils";

type FinalGradingRubricDetailProps = {
  rubricKey: FinalGradingRubricKey;
  className?: string;
  compact?: boolean;
};

export function FinalGradingRubricDetail({
  rubricKey,
  className,
  compact,
}: FinalGradingRubricDetailProps) {
  const rubric = FINAL_GRADING_RUBRICS[rubricKey];

  return (
    <div className={cn("space-y-2 text-left", className)}>
      {rubric.levels.map((item) => (
        <div
          key={item.grade}
          className={cn(
            "rounded-md border border-border/60 bg-muted/40",
            compact ? "p-1.5" : "p-2"
          )}
        >
          <p className={cn("font-semibold text-foreground", compact ? "text-[10px]" : "text-xs")}>
            {item.grade}{" "}
            <span className="font-normal text-muted-foreground">({item.scoreLabel})</span>
          </p>
          <p
            className={cn(
              "text-muted-foreground mt-0.5 leading-snug",
              compact ? "text-[10px]" : "text-xs"
            )}
          >
            {item.description}
          </p>
        </div>
      ))}
    </div>
  );
}
