import { ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/format';
import { useI18n } from '@/i18n';

export const DISCLAIMER =
  'NextCycle shows provisional screening indicators based on public monitoring data. It is not a regulatory determination and does not replace decisions by the State or Regional Water Boards or U.S. EPA. Monitoring data is provisional and subject to revision.';

export function Disclaimer({ className, compact }: { className?: string; compact?: boolean }) {
  const { t } = useI18n();
  return (
    <aside aria-label={t('disclaimerTitle')} data-testid="text-disclaimer" className={cn('rounded-xl border border-teal bg-white', compact ? 'p-4' : 'p-5 md:p-6', className)}>
      <div className="flex gap-3">
        <ShieldAlert aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-teal" />
        <div>
          <p className="label-caps mb-1 text-teal">{t('disclaimerTitle')}</p>
          <p className={cn('text-navy', compact ? 'text-sm' : 'text-[15px]')}>{t('disclaimerBody')}</p>
        </div>
      </div>
    </aside>
  );
}
