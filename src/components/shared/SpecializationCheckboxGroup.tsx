import { Checkbox } from '@/components/ui/checkbox';
import { FormControl, FormItem, FormLabel } from '@/components/ui/form';
import { cn } from '@/lib/utils';

type SpecializationCheckboxGroupProps = {
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  className?: string;
};

export function SpecializationCheckboxGroup({
  options,
  value,
  onChange,
  disabled,
  className,
}: SpecializationCheckboxGroupProps) {
  if (options.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No target specializations listed for this opportunity.</p>
    );
  }

  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 gap-2', className)}>
      {options.map((label) => {
        const checked = value.includes(label);
        return (
          <FormItem
            key={label}
            className="flex items-start space-x-2 space-y-0 rounded-md border border-border/60 p-2"
          >
            <FormControl>
              <Checkbox
                checked={checked}
                disabled={disabled}
                onCheckedChange={(isChecked) => {
                  if (isChecked) {
                    onChange([...value, label]);
                  } else {
                    onChange(value.filter((v) => v !== label));
                  }
                }}
              />
            </FormControl>
            <FormLabel className="text-sm font-normal leading-snug cursor-pointer">{label}</FormLabel>
          </FormItem>
        );
      })}
    </div>
  );
}
