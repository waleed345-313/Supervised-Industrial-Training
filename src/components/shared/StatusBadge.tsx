import { Badge } from '@/components/ui/badge';
import { statusColors } from '@/data/mockData';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  shortlisted: 'Shortlisted',
  allocated: 'Allocated',
  rejected: 'Rejected',
  applied: 'Applied',
  not_applied: 'Not Applied',
  open: 'Open',
  closed: 'Closed',
  filled: 'Filled',
  reviewed: 'Reviewed',
  approved: 'Approved',
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const colorClass = statusColors[status as keyof typeof statusColors] || 'bg-muted text-muted-foreground';
  
  return (
    <Badge variant="outline" className={cn('border', colorClass, className)}>
      {statusLabels[status] || status}
    </Badge>
  );
}
