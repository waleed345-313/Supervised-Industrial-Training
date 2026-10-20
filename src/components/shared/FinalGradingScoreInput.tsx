import { ChevronDown } from "lucide-react";
import { useEffect } from "react";
import type { Control, FieldPath, FieldValues, ControllerRenderProps } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Slider } from "@/components/ui/slider";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { FinalGradingRubricKey } from "@/data/finalGradingRubrics";
import { FinalGradingRubricDetail } from "@/components/shared/FinalGradingRubricDetail";

type FinalGradingScoreInputProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  max: number;
  description?: string;
  rubricKey: FinalGradingRubricKey;
  disabled?: boolean;
  step?: number;
};

function clampScore(raw: number, max: number): number {
  return Math.min(max, Math.max(0, Number.isFinite(raw) ? raw : 0));
}

function ScoreInputField({
  field,
  label,
  max,
  description,
  rubricKey,
  disabled,
  step,
}: {
  field: ControllerRenderProps<FieldValues, string>;
  label: string;
  max: number;
  description?: string;
  rubricKey: FinalGradingRubricKey;
  disabled?: boolean;
  step: number;
}) {
  const raw = field.value as number;
  const score = clampScore(raw, max);

  useEffect(() => {
    if (raw !== score) field.onChange(score);
  }, [raw, score, field]);

  return (
    <FormItem>
      <div className="flex justify-between items-start gap-3">
        <div className="min-w-0 flex-1">
          <FormLabel>{label}</FormLabel>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
          <Collapsible className="mt-1">
            <CollapsibleTrigger className="flex items-center gap-1 text-xs text-primary hover:underline [&[data-state=open]>svg]:rotate-180">
              View rubric details
              <ChevronDown className="h-3 w-3 transition-transform" />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <FinalGradingRubricDetail rubricKey={rubricKey} />
            </CollapsibleContent>
          </Collapsible>
        </div>
        <span className="text-sm font-medium shrink-0 tabular-nums">
          {score}/{max}
        </span>
      </div>
      <FormControl>
        <Slider
          value={[score]}
          onValueChange={(value) => field.onChange(clampScore(value[0], max))}
          min={0}
          max={max}
          step={step}
          className="py-2"
          disabled={disabled}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  );
}

export function FinalGradingScoreInput<T extends FieldValues>({
  control,
  name,
  label,
  max,
  description,
  rubricKey,
  disabled,
  step = 0.5,
}: FinalGradingScoreInputProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <ScoreInputField
          field={field}
          label={label}
          max={max}
          description={description}
          rubricKey={rubricKey}
          disabled={disabled}
          step={step}
        />
      )}
    />
  );
}
