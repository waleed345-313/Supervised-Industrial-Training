import { Badge } from '@/components/ui/badge';
import { statusColors } from '@/data/mockData';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
  /** When the application is a replacement route and the company declined, show "Replaced" instead of "Rejected". */
  isReplacement?: boolean;
}

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  shortlisted: 'Shortlisted',
  allocated: 'Allocated',
  rejected: 'Rejected',
  replaced: 'Replaced',
  exhaust: 'Exhaust',
  completed: 'Completed',
  applied: 'Applied',
  not_applied: 'Not Applied',
  open: 'Open',
  closed: 'Closed',
  filled: 'Filled',
  reviewed: 'Reviewed',
  approved: 'Approved',
};

export function StatusBadge({ status, className, isReplacement }: StatusBadgeProps) {
  const effectiveStatus = isReplacement && status === 'rejected' ? 'replaced' : status;
  const colorClass =
    statusColors[effectiveStatus as keyof typeof statusColors] ||
    statusColors[status as keyof typeof statusColors] ||
    'bg-muted text-muted-foreground';

  return (
    <Badge variant="outline" className={cn('border', colorClass, className)}>
      {statusLabels[effectiveStatus] || statusLabels[status] || status}
    </Badge>
  );
}
