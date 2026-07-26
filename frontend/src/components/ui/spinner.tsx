import { cn } from '@/lib/cn';
import { SpinnerIcon } from '@/components/icons';

export function Spinner({ className }: { className?: string }) {
  return <SpinnerIcon className={cn('h-5 w-5 animate-spin text-muted-foreground', className)} />;
}

export function LoadingBlock({ label = 'Loading…', className }: { label?: string; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground', className)}>
      <SpinnerIcon className="h-7 w-7 animate-spin text-primary" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
