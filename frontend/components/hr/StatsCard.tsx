import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  iconColor?: string;
}

export default function StatsCard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  iconColor = 'text-blue-600',
}: StatsCardProps) {
  return (
    <Card className="border-slate-200 hover:shadow-lg transition-shadow duration-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-600">{title}</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{value}</p>
            {change && (
              <p
                className={cn(
                  'text-sm font-medium mt-2',
                  changeType === 'positive' && 'text-green-600',
                  changeType === 'negative' && 'text-red-600',
                  changeType === 'neutral' && 'text-slate-600'
                )}
              >
                {change}
              </p>
            )}
          </div>
          <div className={cn('p-3 rounded-xl bg-opacity-10', iconColor.replace('text-', 'bg-'))}>
            <Icon className={cn('w-8 h-8', iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
