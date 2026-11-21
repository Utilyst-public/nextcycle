import { AlertTriangle, CheckCircle2, HelpCircle, Landmark, type LucideIcon } from 'lucide-react';
import type { Flag, WaterbodyPair } from '@/data/schema';
import { cn } from '@/lib/format';
import { useI18n } from '@/i18n';

// Chip fills and icon colors follow the brand flag spec. Label text uses the
// darkest text-safe token in the same family so every chip meets WCAG AA.
export const FLAG_STYLE: Record<Flag, { icon: LucideIcon; chip: string; icon_c: string; short: string }> = {
  'Delisting candidate': { icon: CheckCircle2, chip: 'bg-teal-200 border-teal-200 text-teal-800', icon_c: 'text-link', short: 'Delisting' },
  'Still exceeding': { icon: AlertTriangle, chip: 'bg-amber border-amber text-navy', icon_c: 'text-amber-text', short: 'Exceeding' },
  'Under-sampled': { icon: HelpCircle, chip: 'bg-white border-slate border-dashed text-slate', icon_c: 'text-slate', short: 'Under-sampled' },
};

export function FlagBadge({ flag, size = 'md', className, subline = false }: { flag: Flag; size?: 'sm' | 'md' | 'lg'; className?: string; subline?: boolean }) {
  const s = FLAG_STYLE[flag];
  const { flagLabel, flagSubline } = useI18n();
  const Icon = s.icon;
  return (
    <span
      data-testid={`badge-flag-${flag.toLowerCase().replace(/\s+/g, '-')}`}
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border font-semibold',
        size === 'sm' && 'px-2 py-0.5 text-xs',
        size === 'md' && 'px-2.5 py-1 text-[13px]',
        size === 'lg' && 'px-3.5 py-1.5 text-[15px]',
        s.chip,
        className,
      )}
    >
      <Icon aria-hidden className={cn(s.icon_c, size === 'lg' ? 'h-[18px] w-[18px]' : 'h-3.5 w-3.5')} strokeWidth={2.4} />
      <span className="leading-tight">
        {flagLabel(flag)}
        {subline && <span className="block text-[10px] font-medium">{flagSubline(flag)}</span>}
      </span>
    </span>
  );
}

export function OfficialBadge({ pair, size = 'md' }: { pair: Pick<WaterbodyPair, 'official_status' | 'official_category'>; size?: 'sm' | 'md' }) {
  const { t } = useI18n();
  const listed = pair.official_status === 'Listed';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border bg-white font-semibold',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-[13px]',
        listed ? 'border-teal text-teal' : 'border-slate text-slate',
      )}
    >
      <Landmark aria-hidden className="h-3.5 w-3.5" />
      {pair.official_status === 'Listed' ? t('officialListed') : t('officialNotListed')}
      <span className="num font-normal opacity-90">{t('catShort', { category: pair.official_category })}</span>
    </span>
  );
}

export function DacBadge({ ces }: { ces: number }) {
  const { t } = useI18n();
  return (
    <span className="inline-flex items-center rounded-full bg-ice px-2 py-0.5 text-xs font-semibold text-deep" title={t('dacTooltip', { percentile: Math.round(ces) })}>
      {t('dacBadge')}
    </span>
  );
}

export function SampleLabel({ className }: { className?: string }) {
  const { t } = useI18n();
  return (
    <span className={cn('label-caps inline-flex items-center rounded border border-dashed border-slate px-1.5 py-0.5 text-slate', className)}>
      {t('sampleDataLabel')}
    </span>
  );
}
