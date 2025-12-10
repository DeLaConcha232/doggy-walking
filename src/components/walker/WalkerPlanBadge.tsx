import { useWalkerPlan } from '@/hooks/useWalkerPlan';
import { Badge } from '@/components/ui/badge';
import { Crown, Users, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WalkerPlanBadgeProps {
  walkerId: string;
  showDetails?: boolean;
  className?: string;
}

const planColors: Record<string, string> = {
  free: 'bg-muted text-muted-foreground',
  basic: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  premium: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  enterprise: 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
};

const WalkerPlanBadge = ({ walkerId, showDetails = true, className }: WalkerPlanBadgeProps) => {
  const { plan, clientCount, clientLimit, isAtLimit, isNearLimit } = useWalkerPlan(walkerId);

  if (!plan) return null;

  const colorClass = planColors[plan.name] || planColors.free;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Badge className={cn('gap-1.5', colorClass)} variant="secondary">
        {plan.name === 'enterprise' && <Crown className="h-3 w-3" />}
        {plan.displayName}
      </Badge>
      
      {showDetails && (
        <div className={cn(
          'flex items-center gap-1 text-sm px-2 py-0.5 rounded-full',
          isAtLimit ? 'bg-destructive/10 text-destructive' :
          isNearLimit ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
          'bg-muted text-muted-foreground'
        )}>
          <Users className="h-3 w-3" />
          <span className="font-medium">{clientCount}/{clientLimit}</span>
          {isAtLimit && <AlertTriangle className="h-3 w-3 ml-1" />}
        </div>
      )}
    </div>
  );
};

export default WalkerPlanBadge;
