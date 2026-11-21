import { AlertTriangle } from 'lucide-react';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/format';

export function RegionValidationNotice({ regionId, className }: { regionId?: string; className?: string }) {
  const { t } = useI18n();
  if (regionId !== 'R3') return null;

  return (
    <div
      role="note"
      data-testid="note-region-validation-r3"
      className={cn('flex items-start gap-2 rounded-lg border border-amber bg-ice p-3 text-navy', className)}
    >
      <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-amber-text" />
      <p className="text-sm font-semibold leading-relaxed">{t('regionValidationNotice')}</p>
    </div>
  );
}

export function ValidationBadge({ regionId, pairId, surface = 'pair', className }: { regionId?: string; pairId?: string; surface?: string; className?: string }) {
  const { t } = useI18n();
  if (regionId !== 'R3') return null;

  return (
    <span
      data-testid={pairId ? `badge-validation-not-reproduced-${surface}-${pairId}` : 'badge-validation-not-reproduced'}
      className={cn('inline-flex items-center whitespace-nowrap rounded-full border border-dashed border-amber bg-white px-2 py-0.5 text-[10px] font-bold leading-tight text-navy', className)}
    >
      {t('validationNotReproduced')}
    </span>
  );
}
