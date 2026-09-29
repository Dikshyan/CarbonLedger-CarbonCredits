import React from 'react';
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

export type ProjectStatus =
  | 'Pending'
  | 'Under Review'
  | 'Correction Required'
  | 'Verified'
  | 'Rejected'
  | string;

interface StatusBadgeProps {
  status?: ProjectStatus;
  active?: boolean;
  className?: string;
}

export function StatusBadge({ status, active, className = '' }: StatusBadgeProps) {
  const currentStatus = status || (active ? 'Verified' : 'Pending');

  switch (currentStatus) {
    case 'Verified':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 ${className}`}
        >
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          Verified
        </span>
      );

    case 'Under Review':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200 ${className}`}
        >
          <Clock className="h-3.5 w-3.5 text-blue-600 shrink-0" />
          Under Review
        </span>
      );

    case 'Correction Required':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200 ${className}`}
        >
          <AlertTriangle className="h-3.5 w-3.5 text-purple-600 shrink-0" />
          Correction Required
        </span>
      );

    case 'Rejected':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200 ${className}`}
        >
          <XCircle className="h-3.5 w-3.5 text-red-600 shrink-0" />
          Rejected
        </span>
      );

    case 'Pending':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200 ${className}`}
        >
          <Clock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
          {currentStatus || 'Pending'}
        </span>
      );
  }
}

export default StatusBadge;
