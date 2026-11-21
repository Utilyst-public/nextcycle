import { ArrowRight, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { WaterbodyPair } from '@/data/schema';
import { DacBadge, FlagBadge, OfficialBadge } from './Badges';
import { useI18n } from '@/i18n';
import { pollutantName } from '@/i18n/messages';
import { DataFreshnessNote } from './DataFreshnessNote';
import { ValidationBadge } from './RegionValidation';

export function SidePanel({ pair, asOf, onClose }: { pair: WaterbodyPair; asOf: string; onClose: () => void }) {
  const { t } = useI18n();
  const result = pair.screening_flag === 'Delisting candidate' ? t('sideCandidate', { pollutant: pair.pollutant.toLowerCase() })
    : pair.screening_flag === 'Still exceeding' ? t('sideStill', { pollutant: pair.pollutant.toLowerCase() })
      : t('sideUnder', { pollutant: pair.pollutant.toLowerCase() });
  return (
    <section key={pair.pair_id} aria-label={t('waterbodyDetails', { waterbody: pair.waterbody_name })} data-testid="panel-feature" className="slidein card max-h-full overflow-auto p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="label-caps text-slate">{t(pair.waterbody_type === 'River/Stream' ? 'typeRiver' : pair.waterbody_type === 'Lake/Reservoir' ? 'typeLake' : pair.waterbody_type === 'Bay/Harbor' ? 'typeBay' : pair.waterbody_type === 'Coastal' ? 'typeCoastal' : 'typeLagoon')} · {t('countyName', { county: pair.county })}</p>
          <h2 className="mt-1 text-xl">{pair.waterbody_name}</h2>
          <p className="text-navy">{pollutantName(pair.pollutant)}</p>
        </div>
        <button data-testid="button-close-panel" aria-label={t('closeDetails')} onClick={onClose} className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-slate hover:bg-mist hover:text-teal">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-4"><FlagBadge flag={pair.screening_flag} subline /></div>
      <ValidationBadge regionId={pair.region_id} pairId={pair.pair_id} surface="map-panel" className="mt-2" />
      <p className="mt-3 text-sm font-medium text-navy">{result}</p>
      <p className="num mt-2 text-sm text-teal">{t('screeningWithPending', { count: pair.new_exceedances, total: pair.new_samples, direction: t(pair.criterion_direction === 'upper' ? 'aboveDirection' : pair.criterion_direction === 'lower' ? 'belowDirection' : 'outsideDirection'), pending: pair.pending_new_samples ?? 0 })}</p>
      <DataFreshnessNote date={asOf} className="mt-1" />
      {pair.disadvantaged_community === true && pair.ces_percentile != null && <div className="mt-3"><DacBadge ces={pair.ces_percentile} /></div>}
      {(pair.pending_new_samples ?? 0) > 0 && <p className="mt-3 text-xs text-slate">{t('pendingObservationCount', { count: pair.pending_new_samples ?? 0 })}</p>}
      <div className="mt-4 border-t border-line pt-3"><p className="text-xs text-slate">{t('officialStatus')}</p><OfficialBadge pair={pair} size="sm" /></div>
      <Link to={`/w/${pair.pair_id}`} data-testid="link-open-details" className="btn btn-primary arrow-link mt-5 w-full justify-center">
        {t('openDetails')} <ArrowRight aria-hidden className="h-4 w-4" />
      </Link>
    </section>
  );
}
