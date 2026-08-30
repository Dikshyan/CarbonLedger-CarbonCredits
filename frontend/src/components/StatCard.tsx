import { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: 'up' | 'down';
  trendValue?: string;
  description?: string;
  className?: string;
}

export default function StatCard({
  label,
  value,
  icon,
  trend,
  trendValue,
  description,
  className = '',
}: StatCardProps) {
  return (
    <Card className={`p-6 hover:shadow-lg transition-shadow ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-600 mb-1">{label}</p>
          <p className="text-3xl font-bold text-slate-900 mb-2">{value}</p>
          {description && (
            <p className="text-xs text-slate-500">{description}</p>
          )}
        </div>
        {icon && (
          <div className="text-blue-600 ml-4">
            {icon}
          </div>
        )}
      </div>
      {trend && trendValue && (
        <div className={`flex items-center gap-1 mt-4 text-sm font-medium ${
          trend === 'up' ? 'text-green-600' : 'text-red-600'
        }`}>
          {trend === 'up' ? (
            <TrendingUp className="h-4 w-4" />
          ) : (
            <TrendingDown className="h-4 w-4" />
          )}
          {trendValue}
        </div>
      )}
    </Card>
  );
}
