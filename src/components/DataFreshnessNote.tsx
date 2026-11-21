import { fmtDate } from '@/lib/format';
import { useI18n } from '@/i18n';

export function DataFreshnessNote({ date, className = '' }: { date: string; className?: string }) {
  const { t } = useI18n();
  return <p className={`text-xs text-slate ${className}`}>{t('cedenFreshness', { date: fmtDate(date) })}</p>;
}
