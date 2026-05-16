import { ChevronDown, ChevronUp } from "lucide-react";
import type { IndustrialPloRubricKey } from "@/data/industrialPloRubrics";
import { cn } from "@/lib/utils";

type PloRubricHeaderToggleProps = {
  label: string;
  plo: string;
  rubricKey: IndustrialPloRubricKey;
  expanded: boolean;
  onToggle: (key: IndustrialPloRubricKey) => void;
  className?: string;
};

export function PloRubricHeaderToggle({
  label,
  plo,
  rubricKey,
  expanded,
  onToggle,
  className,
}: PloRubricHeaderToggleProps) {
  return (
    <div className={cn("flex flex-col items-center gap-0.5", className)}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggle(rubricKey);
        }}
        className="flex w-full items-center justify-center gap-0.5 rounded px-0.5 hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        aria-expanded={expanded}
        aria-label={`${expanded ? "Hide" : "Show"} rubric for ${label}`}
      >
        <span className="leading-tight">{label}</span>
        {expanded ? (
          <ChevronUp className="h-3 w-3 shrink-0" aria-hidden />
        ) : (
          <ChevronDown className="h-3 w-3 shrink-0" aria-hidden />
        )}
      </button>
      <span className="text-[10px] text-muted-foreground">{plo}</span>
    </div>
  );
}
