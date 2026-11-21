import { cn } from '@/lib/format';
import { useI18n } from '@/i18n';

/**
 * One square per post-cutoff sample. Exceedances are amber and marked with a
 * notch; missing samples up to the delisting minimum are dashed outlines.
 */
export function SampleTally({
  n,
  exceed,
  min,
  sequence,
  size = 'md',
  showLegend = true,
}: {
  n: number;
  exceed: number;
  min: number;
  sequence?: boolean[];
  size?: 'sm' | 'md';
  showLegend?: boolean;
}) {
  const { t } = useI18n();
  const seq = sequence ?? Array.from({ length: n }, (_, i) => i < n - exceed ? false : true);
  const total = Math.max(n, min);
  const cell = size === 'sm' ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5';
  const label = t(n < min ? 'samplesA11yMissing' : 'samplesA11y', { samples: n, exceedances: exceed, minimum: min, needed: min - n });
  return (
    <div>
      <div role="img" aria-label={label} className="flex flex-wrap items-center gap-[3px]">
        {Array.from({ length: total }, (_, i) => {
          const have = i < n;
          const ex = have && seq[i];
          return (
            <span key={i} className="contents">
              <span
                className={cn(
                  'relative inline-block rounded-[3px]',
                  cell,
                  !have && 'border border-dashed border-slate bg-white',
                  have && !ex && 'bg-teal-400',
                  ex && 'border border-amber-text bg-amber',
                )}
              >
                {ex && <span className="absolute inset-x-[2px] top-1/2 h-[1.5px] -translate-y-1/2 bg-amber-text" />}
              </span>
              {i === min - 1 && i !== total - 1 && <span aria-hidden className="mx-0.5 h-5 w-[2px] rounded bg-teal" />}
            </span>
          );
        })}
      </div>
      {showLegend && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate">
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[2px] bg-teal-400" />{t('meetsCriterion')}</span>
          <span className="inline-flex items-center gap-1.5"><span className="relative h-2.5 w-2.5 rounded-[2px] border border-amber-text bg-amber" />{t('exceedsCriterion')}</span>
          {n < min && <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[2px] border border-dashed border-slate" />{t('samplesStillNeeded')}</span>}
          <span className="inline-flex items-center gap-1.5"><span className="h-3 w-[2px] bg-teal" />{t('minimumN', { count: min })}</span>
        </div>
      )}
    </div>
  );
}
