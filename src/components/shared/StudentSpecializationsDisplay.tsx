import { Badge } from '@/components/ui/badge';
import { studentSpecializationList } from '@/lib/studentSpecializations';
import type { Student } from '@/types';
import { cn } from '@/lib/utils';

type StudentSpecializationsDisplayProps = {
  student: Pick<Student, 'specialization' | 'specializations'>;
  className?: string;
  maxWidth?: string;
};

export function StudentSpecializationsDisplay({
  student,
  className,
  maxWidth = 'max-w-[240px]',
}: StudentSpecializationsDisplayProps) {
  const specs = studentSpecializationList(student);
  if (specs.length === 0) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }
  return (
    <div className={cn('flex flex-wrap gap-1', maxWidth, className)}>
      {specs.map((spec) => (
        <Badge key={spec} variant="secondary" className="text-xs font-normal whitespace-normal text-left">
          {spec}
        </Badge>
      ))}
    </div>
  );
}
