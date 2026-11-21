import { cn } from '@/lib/format';

export function Logo({ tone = 'teal', className }: { tone?: 'teal' | 'white'; className?: string }) {
  const onTeal = tone === 'white';
  const mark = `${import.meta.env.BASE_URL}brand/nextcycle-mark${onTeal ? '-white' : ''}.svg`;
  return (
    <span className={cn('inline-flex items-center gap-2 text-[19px] font-bold tracking-tight', onTeal ? 'text-white' : 'text-teal', className)}>
      <img src={mark} alt="" aria-hidden="true" className="h-7 w-7 shrink-0" />
      <span>NextCycle</span>
    </span>
  );
}
