import { RotateCw } from 'lucide-react';
import { cn } from '@/lib/format';

export function Logo({ tone = 'teal', className }: { tone?: 'teal' | 'white'; className?: string }) {
  const onTeal = tone === 'white';
  return (
    <span className={cn('inline-flex items-center gap-2 text-[19px] font-bold tracking-tight', onTeal ? 'text-white' : 'text-teal', className)}>
      <span className={cn('grid h-7 w-7 place-items-center rounded-md', onTeal ? 'bg-white text-teal' : 'bg-teal text-white')}>
        <RotateCw aria-hidden className="h-4 w-4" strokeWidth={2.6} />
      </span>
      NextCycle
    </span>
  );
}
