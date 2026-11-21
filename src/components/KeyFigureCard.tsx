import { forwardRef } from 'react';
import type { Metadata, SampleFile, WaterbodyPair } from '@/data/schema';
import { fmtDate } from '@/lib/format';
import { FlagBadge, OfficialBadge } from './Badges';
import { Logo } from './Logo';
import TimeSeriesChart, { ChartLegend } from './TimeSeriesChart';
import { useI18n } from '@/i18n';
import { dataStatusLabelKey, disclosureKey, pollutantName } from '@/i18n/messages';

/** Fixed-size branded figure rendered offscreen and exported to PNG. */
export const KeyFigureCard = forwardRef<HTMLDivElement, { pair: WaterbodyPair; samples: SampleFile; metadata: Metadata }>(function KeyFigureCard({ pair, samples, metadata }, ref) {
  const { t, criterionText } = useI18n();
  return (
    <div ref={ref} style={{ width: 1200, fontFamily: 'Inter, Arial, sans-serif' }} className="bg-white p-12 text-body">
      <div className="flex items-center justify-between">
        <Logo />
        <span className="label-caps rounded border border-dashed border-slate px-2 py-1 text-slate">{t(dataStatusLabelKey(metadata.data_status))}</span>
      </div>
      <h1 className="mt-8 text-[40px] font-bold text-teal">{pair.waterbody_name}</h1>
      <p className="mt-1 text-xl text-navy">{pollutantName(pair.pollutant)} · {criterionText(pair)}</p>
      <div className="mt-6 flex items-center gap-4">
        <OfficialBadge pair={pair} />
        <FlagBadge flag={pair.screening_flag} size="lg" />
        <span className="num text-xl text-navy">{t('figureExceedanceCount', { exceedances: pair.new_exceedances, samples: pair.new_samples, date: fmtDate(metadata.cutoff_date) })}</span>
      </div>
      {(pair.pending_new_samples ?? 0) > 0 && <p className="mt-3 text-sm text-slate">{t('pendingObservationCount', { count: pair.pending_new_samples ?? 0 })}</p>}
      <div className="mt-8 rounded-lg border border-line p-4">
        <TimeSeriesChart pair={pair} samples={samples} cutoff={metadata.cutoff_date} width={1060} height={380} animate={false} />
        <div className="mt-3"><ChartLegend pair={pair} /></div>
      </div>
      <p className="mt-6 text-sm text-slate">
          {t('keyFigureSource', { source: t('figureSource'), date: fmtDate(metadata.monitoring_data_through), version: metadata.dataset_version })} {t('unitsLabel')}: {samples.unit}. {t(disclosureKey(metadata.data_status))}
      </p>
      <div className="mt-6 flex items-center justify-between border-t border-line pt-5">
         <span className="text-sm font-semibold text-teal">{t('shareableRecord')}</span>
        <span className="num text-sm text-slate">{pair.pair_id}</span>
      </div>
    </div>
  );
});
