import {
  INDUSTRIAL_PLO_RUBRICS,
  type IndustrialPloRubricKey,
} from "@/data/industrialPloRubrics";
import { cn } from "@/lib/utils";

type PloRubricDetailProps = {
  rubricKey: IndustrialPloRubricKey;
  className?: string;
  compact?: boolean;
};

export function PloRubricDetail({ rubricKey, className, compact }: PloRubricDetailProps) {
  const rubric = INDUSTRIAL_PLO_RUBRICS[rubricKey];

  return (
    <div className={cn("space-y-2 text-left", className)}>
      {rubric.levels.map((item) => (
        <div
          key={item.grade}
          className={cn(
            "rounded-md border border-border/60 bg-background/80",
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
