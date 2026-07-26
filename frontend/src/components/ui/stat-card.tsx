import * as React from 'react';
import { cn } from '@/lib/cn';

const toneMap = {
  brand: 'bg-primary/10 text-primary',
  accent: 'bg-accent/10 text-accent',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
  neutral: 'bg-muted text-muted-foreground',
} as const;

export function StatCard({
  label,
  value,
  icon,
  hint,
  tone = 'brand',
  className,
  style,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  icon?: React.ReactNode;
  hint?: React.ReactNode;
  tone?: keyof typeof toneMap;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={style}
      className={cn(
        'animate-fade-in-up group rounded-xl border border-border bg-card p-5 shadow-card transition-shadow hover:shadow-elevated',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        {icon && (
          <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg', toneMap[tone])}>
            {icon}
          </span>
        )}
      </div>
      <p className="mt-3 truncate text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
