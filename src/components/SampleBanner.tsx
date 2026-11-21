import { AlertCircle, X } from 'lucide-react';
import { useState } from 'react';
import { useDataset } from '@/data/provider';
import { useI18n } from '@/i18n';
import { dataStatusLabelKey } from '@/i18n/messages';

const KEY = 'nextcycle.sampleBannerDismissed';

export function SampleBanner() {
  const { state } = useDataset();
  const { t } = useI18n();
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem(KEY) === '1'; } catch { return false; }
  });
  if (state.status !== 'ready') return null;
  const status = state.data.metadata.data_status;
  if (status === 'provisional') {
    return (
      <div role="note" aria-label={t(dataStatusLabelKey(status))} className="border-b border-amber/50 bg-amber/20">
        <div className="wrap flex items-center gap-3 py-2.5 text-sm text-navy">
          <AlertCircle aria-hidden className="h-[18px] w-[18px] shrink-0 text-orange" strokeWidth={2.4} />
          <p data-testid="text-provisional-banner" className="flex-1 font-semibold">{t('provisionalDisclaimer')}</p>
        </div>
      </div>
    );
  }
  if (status !== 'illustrative' || dismissed) return null;
  return (
    <div role="region" aria-label={t('sampleNotice')} className="border-b border-line bg-white">
      <div className="wrap flex items-center gap-3 py-2.5 text-sm text-navy">
        <AlertCircle aria-hidden className="h-[18px] w-[18px] shrink-0 text-orange" strokeWidth={2.4} />
        <p data-testid="text-sample-banner" className="flex-1">
          <strong className="font-semibold">{t('sampleNotice')}</strong> {t('sampleNoticeBody')}
        </p>
        <button
          data-testid="button-dismiss-banner"
          aria-label={t('dismissSample')}
          onClick={() => {
            try { sessionStorage.setItem(KEY, '1'); } catch { /* storage unavailable */ }
            setDismissed(true);
          }}
          className="grid h-8 w-8 place-items-center rounded-md text-slate hover:bg-mist hover:text-teal"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
