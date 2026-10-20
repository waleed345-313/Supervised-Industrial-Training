import { useState } from 'react';
import { Pencil } from 'lucide-react';
import type { ControllerRenderProps, FieldValues } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FormControl, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { CNIC_PLACEHOLDER } from '@/lib/cnic';
import { cn } from '@/lib/utils';

type CnicNumberFieldProps = {
  field: ControllerRenderProps<FieldValues, 'cnicNumber'>;
  savedCnic?: string;
  className?: string;
};

export function CnicNumberField({ field, savedCnic, className }: CnicNumberFieldProps) {
  const stored = savedCnic?.trim() ?? '';
  const hasSaved = stored.length > 0;
  const [isEditing, setIsEditing] = useState(!hasSaved);
  const readOnly = hasSaved && !isEditing;

  return (
    <FormItem className={cn('max-w-md', className)}>
      <div className="flex items-center justify-between gap-2">
        <FormLabel>CNIC Number</FormLabel>
        {readOnly && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => setIsEditing(true)}
            aria-label="Edit CNIC number"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </div>
      <FormControl>
        {readOnly ? (
          <Input
            readOnly
            tabIndex={-1}
            value={stored}
            className="bg-muted text-muted-foreground cursor-default focus-visible:ring-0"
            aria-readonly
          />
        ) : (
          <Input placeholder={CNIC_PLACEHOLDER} {...field} value={field.value ?? ''} />
        )}
      </FormControl>
      <FormMessage />
    </FormItem>
  );
}

/** Remount key so cancel restores read-only when CNIC was already saved. */
export function cnicFieldRemountKey(savedCnic: string | undefined, formRevision: number) {
  return `${savedCnic?.trim() ?? ''}:${formRevision}`;
}
