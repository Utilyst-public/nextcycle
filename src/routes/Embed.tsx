import { useParams } from 'react-router-dom';
import { FlagBadge } from '@/components/Badges';
import type { Dataset } from '@/data/schema';
import { flagLabel } from '@/lib/labels';
import { publicOrigin, usePageTitle } from '@/lib/title';
import { useI18n } from '@/i18n';
import { disclosureKey } from '@/i18n/messages';
import { pollutantName } from '@/i18n/messages';
import { fmtDate } from '@/lib/format';
import { DataFreshnessNote } from '@/components/DataFreshnessNote';
import { RegionValidationNotice, ValidationBadge } from '@/components/RegionValidation';

export default function Embed({ data }: { data: Dataset }) {
  const { pairId = '' } = useParams(); const { t, criterionText } = useI18n();
  const pair = data.pairs.find((p) => p.pair_id === pairId);
  usePageTitle(pair ? t('screeningResultTitle', { waterbody: pair.waterbody_name }) : t('resultUnavailable'), pair ? t('detailMeta', { water: pair.waterbody_name, pollutant: pair.pollutant }) : t('embedUnavailable'), (data.metadata as Dataset['metadata'] & { site_url?: string }).site_url, pair ? `og/${encodeURIComponent(pair.pair_id)}.png` : 'og-image.png');
  if (!pair) return <main className="p-4 text-sm">{t('embedUnavailable')}</main>;
  const appBase = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
  const fullDetailHref = new URL(`${appBase}w/${encodeURIComponent(pair.pair_id)}`, publicOrigin((data.metadata as Dataset['metadata'] & { site_url?: string }).site_url)).toString();
  return <main className="min-h-[100dvh] bg-cloud p-3 sm:p-4">
    <article className="mx-auto max-w-xl overflow-hidden rounded-xl border border-line bg-white shadow-sm">
      <div className="h-2 bg-teal" />
      <div className="p-5"><p className="label-caps text-link">NextCycle · {t('countyName', { county: pair.county })}</p><h1 className="mt-2 text-2xl">{pair.waterbody_name}</h1><p className="mt-1 text-sm text-slate">{pollutantName(pair.pollutant)} · {t('screeningWithPending', { count: pair.new_exceedances, total: pair.new_samples, pending: pair.pending_new_samples ?? 0, direction: t(pair.criterion_direction === 'upper' ? 'aboveDirection' : pair.criterion_direction === 'lower' ? 'belowDirection' : 'outsideDirection') })} ({criterionText(pair)})</p>
        <RegionValidationNotice regionId={pair.region_id} className="mt-3" />
        <DataFreshnessNote date={data.metadata.monitoring_data_through} className="mt-1" />
        <div className="mt-4 flex flex-wrap items-center gap-2"><FlagBadge flag={pair.screening_flag} subline /><ValidationBadge regionId={pair.region_id} pairId={pair.pair_id} surface="embed" /></div>
        <p className="mt-4 text-sm text-navy">{t(pair.screening_flag === 'Delisting candidate' ? 'verdictCandidate' : pair.screening_flag === 'Still exceeding' ? 'verdictStill' : 'verdictUnder', { water: pair.waterbody_name, pollutant: pair.pollutant.toLowerCase(), count: pair.new_exceedances, samples: pair.new_samples, cutoff: fmtDate(data.metadata.cutoff_date) })}</p>
        <p className="mt-4 border-t border-line pt-3 text-xs text-slate">{t(disclosureKey(data.metadata.data_status))} {t('datasetVersionLabel')} {data.metadata.dataset_version} · {t('dataAsOf')} {fmtDate(data.metadata.monitoring_data_through)}.</p>
        <a className="mt-4 inline-flex font-semibold text-link underline underline-offset-2 hover:decoration-2" href={fullDetailHref}>{t('fullDetail')} · nextcycle.tech <span className="sr-only">: {flagLabel(pair.screening_flag)}</span></a>
      </div>
    </article>
  </main>;
}
